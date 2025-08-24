import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://effectkit.dev',
  integrations: [
    starlight({
      title: 'Effect Kit',
      description: 'The Ultimate Full-Stack Framework for Effect.ts Applications',
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      // i18n configuration
      locales: {
        root: {
          label: 'English',
          lang: 'en',
        },
        de: {
          label: 'Deutsch',
          lang: 'de',
        },
        es: {
          label: 'Español',
          lang: 'es',
        },
        fr: {
          label: 'Français',
          lang: 'fr',
        },
        ja: {
          label: '日本語',
          lang: 'ja',
        },
        'zh-cn': {
          label: '简体中文',
          lang: 'zh-CN',
        },
      },
      editLink: {
        baseUrl: 'https://github.com/effectkit/effectkit/edit/main/apps/docs/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/effectkit/effectkit',
        },
        {
          icon: 'discord',
          label: 'Discord',
          href: 'https://discord.gg/effectkit',
        },
        {
          icon: 'twitter',
          label: 'Twitter',
          href: 'https://twitter.com/effectkit',
        },
      ],
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Introduction', link: '/introduction' },
            { label: 'Why Effect Kit?', link: '/why-effect-kit' },
            { label: 'Quick Start', link: '/quick-start' },
            { label: 'Installation', link: '/installation' },
          ],
        },
        {
          label: 'Fundamentals',
          items: [
            { label: 'Project Structure', link: '/fundamentals/project-structure' },
            { label: 'Configuration', link: '/fundamentals/configuration' },
            { label: 'Services & Layers', link: '/fundamentals/services' },
            { label: 'Error Handling', link: '/fundamentals/error-handling' },
            { label: 'Testing', link: '/fundamentals/testing' },
          ],
        },
        {
          label: 'Features',
          items: [
            {
              label: 'Authentication',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/features/auth/overview' },
                { label: 'JWT Auth', link: '/features/auth/jwt' },
                { label: 'Social Login', link: '/features/auth/social' },
                { label: 'Permissions', link: '/features/auth/permissions' },
              ],
            },
            {
              label: 'Database',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/features/database/overview' },
                { label: 'Queries', link: '/features/database/queries' },
                { label: 'Migrations', link: '/features/database/migrations' },
                { label: 'Seeding', link: '/features/database/seeding' },
              ],
            },
            {
              label: 'API',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/features/api/overview' },
                { label: 'Routes', link: '/features/api/routes' },
                { label: 'RPC', link: '/features/api/rpc' },
                { label: 'WebSockets', link: '/features/api/websockets' },
              ],
            },
            {
              label: 'Frontend',
              collapsed: true,
              items: [
                { label: 'Overview', link: '/features/frontend/overview' },
                { label: 'Components', link: '/features/frontend/components' },
                { label: 'Forms', link: '/features/frontend/forms' },
                { label: 'State Management', link: '/features/frontend/state' },
              ],
            },
          ],
        },
        {
          label: 'Recipes',
          items: [
            { label: 'Building a REST API', link: '/recipes/rest-api' },
            { label: 'GraphQL Server', link: '/recipes/graphql' },
            { label: 'File Uploads', link: '/recipes/file-uploads' },
            { label: 'Payment Integration', link: '/recipes/payments' },
            { label: 'Background Jobs', link: '/recipes/background-jobs' },
            { label: 'Real-time Features', link: '/recipes/realtime' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Overview', link: '/deployment/overview' },
            { label: 'Docker', link: '/deployment/docker' },
            { label: 'Vercel', link: '/deployment/vercel' },
            { label: 'Fly.io', link: '/deployment/fly' },
            { label: 'Railway', link: '/deployment/railway' },
          ],
        },
        {
          label: 'CLI Reference',
          items: [
            { label: 'Overview', link: '/cli/overview' },
            { label: 'Commands', link: '/cli/commands' },
            { label: 'Generators', link: '/cli/generators' },
          ],
        },
        {
          label: 'API Reference',
          link: '/api',
        },
      ],
      components: {
        Header: './src/components/Header.astro',
        Hero: './src/components/Hero.astro',
      },
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});