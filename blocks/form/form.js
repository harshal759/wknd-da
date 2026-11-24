import createField from './form-fields.js';

async function createForm(formHref) {
  console.log('Fetching:', formHref);
  let json;

  try {
    const resp = await fetch(formHref);
    console.log('Response status:', resp.status);
    console.log('Response URL:', resp.url);
    if (!resp.ok) {
      throw new Error(`HTTP error: ${resp.status}`);
    }
    json = await resp.json();
    console.log('Form JSON:', json);
  } catch (error) {
    console.error('Form fetch error:', error);
    throw error;
  }

  const definition = json.afModelDefinition;
  if (!definition) {
    throw new Error('Invalid form JSON: afModelDefinition not found');
  }

  const form = document.createElement('form');
  form.dataset.action = new URL(definition.action, formHref).href;;
  const items = definition[':items'] || {};
  const itemsOrder = definition[':itemsOrder'] || Object.keys(items);
  const fields = await Promise.all(
    itemsOrder
    .filter((key) => items[key])
    .map((key) => createField(items[key], form)),
  );

  fields.forEach((field) => {
    if (field) form.append(field);
  });

  // Continue with fieldset grouping...
  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    if (submit) submit.disabled = true;

    // create payload
    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    form.setAttribute('data-submitting', 'false');
    if (submit) submit.disabled = false;
  }
}

export default async function decorate(block) {
  const formLink = block.querySelector('a')?.href;

  if (!formLink) {
    console.error('Form definition URL not found');
    return;
  }

  try {
    const form = await createForm(formLink);

    block.replaceChildren(form);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const valid = form.checkValidity();

      if (valid) {
        handleSubmit(form);
      } else {
        const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');

        if (firstInvalidEl) {
          firstInvalidEl.focus();
          firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  } catch (error) {
    console.error('Unable to render form:', error);
  }
}
