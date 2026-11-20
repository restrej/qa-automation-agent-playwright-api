/**
 * Función que se ejecuta DENTRO del navegador (page.evaluate).
 * Extrae formularios, campos, botones, menús de categorías y propone
 * el mejor localizador Playwright para cada elemento según buenas prácticas:
 *   data-testid > rol + nombre accesible (único) > label (único) > id estable > placeholder > name > CSS acotado
 * No puede usar variables externas: todo debe estar definido aquí.
 */
export function extractPage() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const isVisible = (el) => {
    if (!el || !el.getClientRects().length) return false;
    const st = getComputedStyle(el);
    return st.visibility !== 'hidden' && st.display !== 'none';
  };
  const unstableId = (id) => !id || /\d{4,}|^[0-9a-f-]{16,}$|^(ember|react|:r|mui-|radix-)/i.test(id);

  const labelOf = (el) => {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.textContent);
    }
    const wrap = el.closest('label');
    if (wrap) return clean(wrap.textContent);
    const by = el.getAttribute('aria-labelledby');
    if (by) return clean(by.split(' ').map((i) => document.getElementById(i)?.textContent).join(' '));
    return '';
  };

  const roleOf = (el) => {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (tag === 'a' && el.hasAttribute('href')) return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'select') return el.multiple ? 'listbox' : 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'input') {
      if (['submit', 'button', 'reset', 'image'].includes(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (['text', 'email', 'search', 'tel', 'url', 'number'].includes(type)) return type === 'number' ? 'spinbutton' : 'textbox';
    }
    return '';
  };

  const nameOf = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria) return clean(aria);
    const label = labelOf(el);
    if (label) return label;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && ['submit', 'button', 'reset'].includes((el.type || '').toLowerCase())) return clean(el.value);
    if (tag === 'a' || tag === 'button') return clean(el.innerText || el.textContent).slice(0, 80);
    return clean(el.getAttribute('title') || el.getAttribute('alt') || '');
  };

  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 3) {
      let part = node.tagName.toLowerCase();
      if (node.id && !unstableId(node.id)) {
        parts.unshift(`#${CSS.escape(node.id)}`);
        break;
      }
      const cls = [...node.classList].filter((c) => !/active|selected|hover|focus|\d{3,}/.test(c)).slice(0, 2);
      if (cls.length) part += '.' + cls.map((c) => CSS.escape(c)).join('.');
      parts.unshift(part);
      node = node.parentElement;
    }
    return parts.join(' ');
  };

  // Conteos para validar unicidad de rol+nombre y labels
  const interactive = [...document.querySelectorAll('a[href],button,input,select,textarea,[role=button],[role=link]')].filter(isVisible);
  const roleNameCount = {};
  const labelCount = {};
  for (const el of interactive) {
    const k = `${roleOf(el)}|${nameOf(el)}`;
    roleNameCount[k] = (roleNameCount[k] || 0) + 1;
    const l = labelOf(el);
    if (l) labelCount[l] = (labelCount[l] || 0) + 1;
  }

  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || (tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'text')).toLowerCase();
    const role = roleOf(el);
    const name = nameOf(el);
    const label = labelOf(el);
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-qa');
    const candidates = [];
    if (testId) candidates.push({ strategy: 'testid', code: `page.getByTestId('${q(testId)}')`, score: 100 });
    if (role && name && roleNameCount[`${role}|${name}`] === 1)
      candidates.push({ strategy: 'role', code: `page.getByRole('${role}', { name: '${q(name)}', exact: true })`, score: 90 });
    if (label && labelCount[label] === 1 && ['input', 'select', 'textarea'].includes(tag))
      candidates.push({ strategy: 'label', code: `page.getByLabel('${q(label)}', { exact: true })`, score: 85 });
    if (el.id && !unstableId(el.id)) candidates.push({ strategy: 'id', code: `page.locator('#${q(CSS.escape(el.id))}')`, score: 80 });
    if (el.getAttribute('placeholder'))
      candidates.push({ strategy: 'placeholder', code: `page.getByPlaceholder('${q(el.getAttribute('placeholder'))}')`, score: 70 });
    if (el.getAttribute('name')) candidates.push({ strategy: 'name', code: `page.locator('${tag}[name="${q(el.getAttribute('name'))}"]')`, score: 60 });
    candidates.push({ strategy: 'css', code: `page.locator('${q(cssPath(el))}')`, score: 30 });
    candidates.sort((a, b) => b.score - a.score);
    return {
      tag,
      type,
      role,
      name,
      label,
      id: el.id || '',
      htmlName: el.getAttribute('name') || '',
      required: el.required || el.getAttribute('aria-required') === 'true' || !!el.closest('.inputs')?.querySelector('.required'),
      value: tag === 'select' ? clean(el.selectedOptions?.[0]?.textContent) : el.type === 'password' ? '' : el.value || '',
      options: tag === 'select' ? [...el.options].slice(0, 15).map((o) => clean(o.textContent)) : undefined,
      locator: candidates[0],
      alternatives: candidates.slice(1, 3),
    };
  };

  const fieldSelector = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea';
  const buttonSelector = 'button,input[type=submit],input[type=button],input[type=image],[role=button]';

  const forms = [];
  const seenFields = new Set();
  const groups = [...document.querySelectorAll('form')];
  for (const [i, form] of groups.entries()) {
    const fields = [...form.querySelectorAll(fieldSelector)].filter(isVisible);
    const buttons = [...form.querySelectorAll(buttonSelector)].filter(isVisible);
    if (!fields.length) continue;
    fields.forEach((f) => seenFields.add(f));
    const heading = clean(form.querySelector('h1,h2,h3,legend,.title,strong')?.textContent) || '';
    forms.push({
      index: i,
      id: form.id || '',
      action: form.getAttribute('action') || '',
      heading,
      fields: fields.slice(0, 40).map(describe),
      buttons: buttons.slice(0, 8).map(describe),
    });
  }

  // Menú de categorías (listas anidadas dentro de nav/menús)
  const categories = [];
  const menu =
    document.querySelector('ul.top-menu') ||
    document.querySelector('nav ul') ||
    document.querySelector('[role=navigation] ul') ||
    document.querySelector('ul[class*=menu]');
  if (menu) {
    for (const li of [...menu.children].filter((c) => c.tagName === 'LI').slice(0, 15)) {
      const a = li.querySelector(':scope > a');
      if (!a) continue;
      const subs = [...li.querySelectorAll(':scope ul a')].map((s) => ({ name: clean(s.textContent), href: s.href }));
      categories.push({ name: clean(a.textContent), href: a.href, subcategories: subs.slice(0, 12) });
    }
  }

  const links = [...document.querySelectorAll('a[href]')]
    .filter(isVisible)
    .map((a) => ({ text: clean(a.innerText || a.title), href: a.href }))
    .filter((l) => l.text && l.href.startsWith(location.origin))
    .slice(0, 200);

  const addToCart = [...document.querySelectorAll(buttonSelector)].filter(
    (b) => isVisible(b) && /add to cart|añadir al carrito|agregar al carrito/i.test(nameOf(b)),
  );

  return {
    url: location.href,
    path: location.pathname,
    title: document.title,
    h1: clean(document.querySelector('h1')?.textContent),
    forms,
    categories,
    links,
    hasProductGrid: !!document.querySelector('.product-grid, .products, [class*=product-list], [class*=product-grid]'),
    addToCartButtons: addToCart.slice(0, 3).map(describe),
    hasCartTable: !!document.querySelector('table.cart, [class*=cart-table], .shopping-cart'),
    passwordFields: document.querySelectorAll('input[type=password]').length,
  };
}
