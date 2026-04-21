/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeStyle,
} from '@kbn/core-chrome-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface HelpData {
  menuLinks: ChromeHelpMenuLink[];
  extension: ChromeHelpExtension | undefined;
  supportUrl: string;
  globalExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
  docLinks: DocLinksStart;
}

export interface HelpMenuLinkItem {
  name: string;
  key: string;
  icon?: IconType;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
  isExternal?: boolean;
  dataTestSubj?: string;
}

export interface HelpLinks {
  global: HelpMenuLinkItem[];
  default: HelpMenuLinkItem[];
  extension?: {
    label?: string;
    items: HelpMenuLinkItem[];
  };
}

export const buildDefaultContentLinks = ({
  chromeStyle,
  docLinks,
  helpSupportUrl,
}: {
  chromeStyle: ChromeStyle;
  docLinks: DocLinksStart;
  helpSupportUrl: string;
}): ChromeHelpMenuLink[] => [
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuKibanaDocumentationTitle', {
      defaultMessage: 'Kibana documentation',
    }),
    href:
      chromeStyle === 'project'
        ? docLinks.links.elasticStackGetStarted
        : docLinks.links.kibana.guide,
  },
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuAskElasticTitle', {
      defaultMessage: 'Ask Elastic',
    }),
    href: helpSupportUrl,
  },
  {
    title: i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuOpenGitHubIssueTitle', {
      defaultMessage: 'Open an issue in GitHub',
    }),
    href: docLinks.links.kibana.createGithubIssue,
  },
];

export const buildHelpLinks = ({
  chromeStyle,
  helpData,
}: {
  chromeStyle: ChromeStyle;
  helpData: HelpData;
}): HelpLinks => {
  const global = [...helpData.globalExtensionMenuLinks]
    .sort((a, b) => b.priority - a.priority)
    .map((link) => ({
      name: link.content,
      key: `global-${link.href}`,
      href: link.href,
      target: link.target,
      rel: link.rel,
      icon: link.iconType,
      isExternal: link.external,
      dataTestSubj: link['data-test-subj'],
    }));

  const rawDefaultLinks =
    helpData.menuLinks.length > 0
      ? helpData.menuLinks
      : buildDefaultContentLinks({
          chromeStyle,
          docLinks: helpData.docLinks,
          helpSupportUrl: helpData.supportUrl,
        });

  const defaultLinks = rawDefaultLinks.map(
    ({ title, href, onClick, dataTestSubj, iconType }, index) => ({
      name: title,
      key: `default-${index}`,
      icon: iconType,
      href,
      target: href ? '_blank' : undefined,
      onClick,
      isExternal: Boolean(href),
      dataTestSubj,
    })
  );

  const extensionItems = helpData.extension?.links?.map((link, index) => {
    const isDocumentation = link.linkType === 'documentation';
    return {
      name: isDocumentation
        ? i18n.translate('core.ui.chrome.headerGlobalNav.helpMenuDocumentation', {
            defaultMessage: 'Documentation',
          })
        : link.content,
      key: `extension-${index}`,
      icon: link.iconType,
      href: link.href,
      target: link.target ?? (isDocumentation ? '_blank' : undefined),
      rel: link.rel ?? (isDocumentation ? 'noopener' : undefined),
      onClick: !isDocumentation ? link.onClick : undefined,
      isExternal: isDocumentation || link.external,
      dataTestSubj: link['data-test-subj'],
    };
  });

  const hasExtension = (extensionItems?.length ?? 0) > 0;

  return {
    global,
    default: defaultLinks,
    ...(hasExtension
      ? {
          extension: {
            label: helpData.extension?.appName,
            items: extensionItems ?? [],
          },
        }
      : {}),
  };
};
