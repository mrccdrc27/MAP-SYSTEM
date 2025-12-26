// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // 1. The Global Platform Sidebar
  platformSidebar: [
    { 
      type: 'category', 
      label: '🌐 Platform Core',
      collapsed: false,
      items: [
        'platform/overview',
        'platform/architecture',
        'platform/authentication-flow',
        'platform/event-bus',
        'platform/installation', 
      ]
    },
    { 
      type: 'category', 
      label: '🔐 Auth System',
      collapsed: false,
      items: [
        'auth-system/overview',
        {
          type: 'category',
          label: '🚀 Getting Started',
          collapsed: false,
          items: [
            'auth-system/getting-started/quick-start',
            'auth-system/getting-started/configuration',
            'auth-system/getting-started/seeding',
            'auth-system/getting-started/testing',
            'auth-system/getting-started/docker',
            'auth-system/getting-started/troubleshooting',
            'auth-system/getting-started/extending',
          ]
        },
        {
          type: 'category',
          label: '📖 Service Documentation',
          collapsed: true,
          items: [
            'auth-system/service-documentation/architecture',
            'auth-system/service-documentation/auth-mechanisms',
            'auth-system/service-documentation/middleware-security',
            'auth-system/service-documentation/api-reference',
            'auth-system/service-documentation/integration-points',
          ]
        },
        'auth-system/user-roles',
        'auth-system/sso-integration',
        'auth-system/api-tokens',
      ]
    },
  ],

  // 2. AMS System Sidebar
  amsSidebar: [
    'ams/intro',
    {
      type: 'category',
      label: '⚙️ Installation & Deploy',
      items: ['ams/deployment/docker', 'ams/deployment/env-vars'],
    },
    {
      type: 'category',
      label: '🏗️ Architecture',
      items: ['ams/architecture/depreciation-engine'],
    },
    {
      type: 'category',
      label: '📘 User Manual',
      items: ['ams/user-guide/check-in-out'],
    },
  ],

  // 3. BMS System Sidebar
  bmsSidebar: [
    'bms/intro',
    {
      type: 'category',
      label: 'Modules',
      items: ['bms/proposals', 'bms/variance-reports'],
    }
  ],
  
  // 4. TTS System Sidebar
  ttsSidebar: [
    'tts/intro',
    'tts/overview',
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: [
        'tts/getting-started/quick-start',
        'tts/getting-started/configuration',
        'tts/getting-started/seeding',
        'tts/getting-started/docker',
      ]
    },
    {
      type: 'category',
      label: '📖 Service Documentation',
      collapsed: true,
      items: [
        'tts/service-documentation/architecture',
        'tts/service-documentation/workflow-engine',
        'tts/service-documentation/task-management',
        'tts/service-documentation/api-reference',
        'tts/service-documentation/integration-points',
        'tts/service-documentation/development',
      ]
    },
    'tts/workflow-engine',
    'tts/sla-configuration',
  ],

  // 5. HDTS System Sidebar
  hdtsSidebar: [
    'hdts/intro',
    {
      type: 'category',
      label: 'Modules',
      items: ['hdts/email-parsing', 'hdts/ticket-submission'],
    }
  ],
};

export default sidebars;
