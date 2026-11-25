import { toClassName } from '../../scripts/aem.js';

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');
  if (fd.Style) fieldWrapper.className = fd.Style;
  fieldWrapper.classList.add('field-wrapper', `${fd.Type}-wrapper`);
if (fd.Fieldset) {
  fieldWrapper.dataset.fieldset = fd.Fieldset;
 }
  return fieldWrapper;
}

const ids = new Map();
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name || fd.Type}${suffix}`);
   const count = ids.get(slug) || 0;
  ids.set(slug, count + 1);
  return count ? `${slug}-${count}` : slug;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.textContent = fd.Label || fd.Name;
  label.setAttribute('for', fd.Id);
   if (fd.Mandatory === true || ['true', 'x'].includes(String(fd.Mandatory).toLowerCase())) {
    label.dataset.required = true;
  }
  return label;
}

function isRequired(fd) {
  return fd.Mandatory === true
    || ['true', 'x'].includes(String(fd.Mandatory).toLowerCase());
}

function setCommonAttributes(field, fd) {
  field.id = fd.Id;
  field.name = fd.Name;
  field.required = fd.Mandatory === true || ['true', 'x'].includes(String(fd.Mandatory).toLowerCase());
  if (fd.Placeholder) field.placeholder = fd.Placeholder;
  if (fd.Value !== undefined && fd.Value !== null) field.value = fd.Value;
}

const createHeading = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const level = fd.Style && fd.Style.includes('sub-heading') ? 3 : 2;
  const heading = document.createElement(`h${level}`);
  heading.textContent = fd.Value || fd.Label;
  heading.id = fd.Id;

  fieldWrapper.append(heading);

  return { field: heading, fieldWrapper };
};

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const content = document.createElement('div');
  content.id = fd.Id;

  if (fd.RichText) {
    const template = document.createElement('template');
    template.innerHTML = fd.Value || '';

    // Allow only the HTML elements needed for rich text.
    const allowedTags = [
      'H1', 'H2', 'H3', 'H4',
      'P', 'BR', 'B', 'STRONG',
      'I', 'EM', 'UL', 'OL', 'LI',
      'A',
    ];

    template.content.querySelectorAll('*').forEach((element) => {
      if (!allowedTags.includes(element.tagName)) {
        element.replaceWith(...element.childNodes);
      } else {
        [...element.attributes].forEach((attribute) => {
          if (
            element.tagName !== 'A'
            || !['href', 'target', 'rel'].includes(attribute.name)
          ) {
            element.removeAttribute(attribute.name);
          }
        });
      }
    });

    content.append(template.content);
  } else {
    content.textContent = fd.Value || fd.Label;
  }

  fieldWrapper.append(content);

  return { field: content, fieldWrapper };
};


const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);

  const addOption = ({ text, label, value }) => {
    const option = document.createElement('option');
    option.textContent = label ?? text ?? String(value);
    option.value = String(value);
    if (String(value) === String(fd.Value)) {
  option.selected = true;
}
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    const placeholder = addOption({
      text: fd.Placeholder,
      value: '',
    });
    placeholder.disabled = true;
    placeholder.selected = !fd.Value;
  }

  if (Array.isArray(fd.Options)) {
    fd.Options.forEach(addOption);
  } else if (typeof fd.Options === 'string' && fd.Options) {
    let options = [];

    if (/^https:\/\//i.test(fd.Options)) {
      const optionsUrl = new URL(fd.Options);
      const response = await fetch(
        `${optionsUrl.pathname}${optionsUrl.search}`,
      );

      if (!response.ok) {
        throw new Error(`Options request failed: ${response.status}`);
      }

      const json = await response.json();

      options = (json.data || []).map((option) => ({
        text: option.Option,
        value: option.Value || option.Option,
      }));
    } else {
      options = fd.Options.split(',').map((option) => ({
        text: option.trim(),
        value: option.trim().toLowerCase(),
      }));
    }

    options.forEach(addOption);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(select);
  fieldWrapper.prepend(createLabel(fd));

  return { field: select, fieldWrapper };
};


const createConfirmation = (fd, form) => {
  if (!fd.Value) return {};

  form.dataset.confirmation = new URL(fd.Value, window.location.origin).pathname;

  return {};
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  fieldWrapper.prepend(label);

  return { field, fieldWrapper };
};

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = fd.Type;
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  if (fd.Type === 'radio' || fd.Type === 'checkbox') {
    fieldWrapper.append(label);
  } else {
    fieldWrapper.prepend(label);
  }

  return { field, fieldWrapper };
};

const createFieldset = (fd) => {
  const field = document.createElement('fieldset');
  setCommonAttributes(field, fd);

  if (fd.Label) {
    const legend = document.createElement('legend');
    legend.textContent = fd.Label;
    if (isRequired(fd)) {
  legend.dataset.required = true;
}
    field.append(legend);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(field);

  return { field, fieldWrapper };
};

const createToggle = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  field.type = 'checkbox';
  if (!field.value) field.value = 'on';
  field.classList.add('toggle');
  fieldWrapper.classList.add('selection-wrapper');

  const toggleSwitch = document.createElement('div');
  toggleSwitch.classList.add('switch');
  toggleSwitch.append(field);
  fieldWrapper.append(toggleSwitch);

  const slider = document.createElement('span');
  slider.classList.add('slider');
  toggleSwitch.append(slider);
  slider.addEventListener('click', () => {
    field.checked = !field.checked;
  });

  return { field, fieldWrapper };
};

const createCheckbox = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = 'checked';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const createRadio = (fd) => {
  const fieldset = document.createElement('fieldset');
  fieldset.id = fd.Id;

  if (fd.Label) {
    const legend = document.createElement('legend');
    legend.textContent = fd.Label;

    if (isRequired(fd)) {
      legend.dataset.required = true;
    }

    fieldset.append(legend);
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.classList.add('selection-wrapper');

  if (!Array.isArray(fd.Options) || fd.Options.length === 0) {
    console.warn(`No options provided for radio group: ${fd.Name}`);
    return { field: fieldset, fieldWrapper };
  }

  fd.Options.forEach((option, index) => {
    const optionWrapper = document.createElement('div');
    optionWrapper.classList.add('radio-option');

    const input = document.createElement('input');
    input.type = 'radio';
    input.id = generateFieldId(fd, `-option-${index}`);
    input.name = fd.Name;
    input.value = String(option.value ?? '');
    input.required = index === 0 && isRequired(fd);

    if (String(option.value) === String(fd.Value)) {
      input.checked = true;
    }

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = option.label ?? String(option.value);

    optionWrapper.append(input, label);
    fieldset.append(optionWrapper);
  });

  fieldWrapper.append(fieldset);

  return { field: fieldset, fieldWrapper };
};

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  heading: createHeading,
  plaintext: createPlaintext,
  textarea: createTextArea,
  toggle: createToggle,
  submit: createSubmit,
  confirmation: createConfirmation,
  fieldset: createFieldset,
  checkbox: createCheckbox,
  radio: createRadio,
  // Generic input fields
  text: createInput,
  email: createInput,
  tel: createInput,
  date: createInput,
  number: createInput,
};
// added a normal function to normalize the field 
// data structure to match the expected format for field creation. 
// This function ensures that the field data has consistent property names and default values.

function normalizeField(fd) {
  const componentType = fd[':type']?.split('/').pop()
    || fd.properties?.aueComponentId
    || '';

  const rawType = fd.fieldType || fd.Type;

  // More specific component metadata takes precedence for generic text inputs.
  const fieldType = rawType || componentType || 'text';

  const typeMap = {
    'text-input': 'text',
    'telephone-input': 'tel',
    telephoneinput: 'tel',
    'date-input': 'date',
    'drop-down': 'select',
    'multiline-input': 'textarea',
    'plain-text': 'plaintext',
    'radio-group': 'radio',
    'number-input': 'number',
    button: 'submit',
  };

  const normalizedType = String(fieldType).toLowerCase();
const type = typeMap[normalizedType] || normalizedType;

  return {
    ...fd,
    Id: fd.id || fd.Id || '',
    Name: fd.name || fd.Name || '',
    Type: type,
    Label: fd.label?.value || fd.Label || '',
    Mandatory: fd.required ?? fd.Mandatory ?? false,
    Placeholder: fd.placeholder || fd.Placeholder || '',
    Value: fd.value ?? fd.Value ?? '',
    Options: fd.enum
      ? fd.enum.map((value, index) => ({
        value,
        label: fd.enumNames?.[index] ?? String(value),
      }))
      : fd.Options || [],
    Fieldset: fd.Fieldset || '',
    Style: fd.Style || '',
    RichText: fd.richText ?? fd.RichText ?? false,
  };
}

export default async function createField(fd, form) {
  const fieldData = normalizeField(fd);

  fieldData.Id = fieldData.Id || generateFieldId(fieldData);
  const type = String(fieldData.Type || 'unknown').toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type];
  if (!createFieldFunc) {
  console.warn(`Unsupported AEM Forms field type: ${type}`);
  return null;
}
  const fieldElements = await createFieldFunc(fieldData, form);

  return fieldElements.fieldWrapper;
}
