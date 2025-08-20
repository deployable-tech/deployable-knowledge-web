export const windowsConfig = [
  {
    id: 'services',
    title: 'LLM Service & Model',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'loadServices', text: 'Load Services' },
        { tag: 'button', id: 'refreshSelection', text: 'Get Selection' },
        { tag: 'button', id: 'manageServices', text: 'Manage Services' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Service' },
        { tag: 'select', id: 'svc' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Model' },
        { tag: 'select', id: 'model' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'setSelection', text: 'Update Selection' }
      ]},
      { tag: 'div', id: 'serviceLst' },
      { tag: 'div', id: 'serviceCards' },
      { tag: 'div', id: 'modelCards' }
    ]
  },
  {
    id: 'service-admin',
    title: 'LLM Service Admin',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'newSvcProvider', attrs: { placeholder: 'provider' } },
        { tag: 'input', id: 'newSvcBaseUrl', attrs: { placeholder: 'base URL' } },
        { tag: 'input', id: 'newSvcAuth', attrs: { placeholder: 'auth ref' } },
        { tag: 'button', id: 'createSvc', text: 'Create Service' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'delSvcId', attrs: { placeholder: 'service id' } },
        { tag: 'button', id: 'deleteSvc', text: 'Delete Service' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'modelSvcId', attrs: { placeholder: 'service id' } },
        { tag: 'input', id: 'modelName', attrs: { placeholder: 'model name' } },
        { tag: 'input', id: 'modelModality', attrs: { placeholder: 'modality' } },
        { tag: 'button', id: 'createModel', text: 'Add Model' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'delModelId', attrs: { placeholder: 'model id' } },
        { tag: 'button', id: 'deleteModel', text: 'Delete Model' }
      ]},
      { tag: 'pre', id: 'svcAdminOut', class: 'mono', attrs: { style: 'max-height:200px;' } }
    ]
  },
  {
    id: 'search',
    title: 'Search',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'q', attrs: { placeholder: 'query…' } },
        { tag: 'label', text: 'Top K' },
        { tag: 'input', id: 'topK', attrs: { type: 'number', value: '5', style: 'max-width:80px;' } },
        { tag: 'button', id: 'doSearch', text: 'Run' }
      ]},
      { tag: 'div', id: 'searchOut', class: 'list' }
    ]
  },
  {
    id: 'documents',
    title: 'Documents',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'files', attrs: { type: 'file', multiple: true } },
        { tag: 'button', id: 'upload', text: 'Upload' },
        { tag: 'button', id: 'ingestAll', text: 'Ingest All' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'removeSource', attrs: { placeholder: 'source name to remove…' } },
        { tag: 'button', id: 'remove', text: 'Remove Source' },
        { tag: 'button', id: 'clearDb', text: 'Clear DB' }
      ]},
      { tag: 'pre', id: 'ingOut', class: 'mono', attrs: { style: 'max-height:160px;' } },
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'listDocs', text: 'List Documents' },
        { tag: 'span', id: 'docCount', class: 'subtle' }
      ]},
      { tag: 'div', id: 'docs', class: 'list' },
      { tag: 'div', class: 'spacer' },
      { tag: 'div', class: 'row', children: [
        { tag: 'label', attrs: { style: 'min-width:80px;' }, text: 'Segments of' },
        { tag: 'input', id: 'segSource', attrs: { placeholder: 'source.txt (auto-fills on click)' } },
        { tag: 'button', id: 'listSegs', text: 'List Segments' }
      ]},
      { tag: 'div', id: 'segs', class: 'list' },
      { tag: 'pre', id: 'segView', class: 'mono', attrs: { style: 'max-height:160px;' } }
    ]
  },
  {
    id: 'chat',
    title: 'Chat',
    layout: [
      { tag: 'div', id: 'chatOut', class: 'chat-history' },
      { tag: 'div', class: 'chat-input', children: [
        { tag: 'textarea', id: 'msg', attrs: { placeholder: 'Ask your system something grounded…' } },
        { tag: 'div', class: 'row', children: [
          { tag: 'button', id: 'send', text: 'Send' },
          { tag: 'span', id: 'meta', class: 'subtle mono' }
        ]}
      ]}
    ]
  },
  {
    id: 'history',
    title: 'Chat History',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'newChat', text: 'New Chat' },
        { tag: 'button', id: 'listSessions', text: 'List Sessions' }
      ]},
      { tag: 'div', id: 'sessionList', class: 'list' }
    ]
  },
  {
    id: 'persona',
    title: 'Persona',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'savePersona', text: 'Save' },
        { tag: 'button', id: 'cancelPersona', text: 'Cancel' }
      ]},
      { tag: 'textarea', id: 'persona', attrs: { placeholder: 'optional persona' } }
    ]
  },
  {
    id: 'templates',
    title: 'Templates & Settings',
    layout: [
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'base', attrs: { size: '42' } },
        { tag: 'button', id: 'init', text: 'Init SDK' },
        { tag: 'button', id: 'prime', text: 'Prime User Session' },
        { tag: 'button', id: 'ensure', text: 'Ensure Session' },
        { tag: 'span', id: 'sid', class: 'mono subtle' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'button', id: 'loadTemplates', text: 'Load Templates' },
        { tag: 'select', id: 'tplSel' }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'label', text: 'Template ID' },
        { tag: 'input', id: 'templateId', attrs: { value: 'rag_chat' } }
      ]},
      { tag: 'div', class: 'row', children: [
        { tag: 'input', id: 'userId', attrs: { value: 'local-user' } },
        { tag: 'button', id: 'getSettings', text: 'Get Settings' }
      ]},
      { tag: 'div', id: 'tplCard' }
    ]
  }
];
