/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

/**
 * Where a right-side nav control appears when chrome style is `project`.
 * Left/center controls always render in the project sidenav top cluster.
 * @public
 */
export type ChromeNavControlProjectChrome =
  | 'navFooterProfile'
  | 'helpMenuExtras'
  /** Top global project header (first bar), e.g. next to Help — not the application AppBar row. */
  | 'projectHeader'
  | 'appBar';

/** @public */
export interface ChromeNavControl {
  order?: number;
  /**
   * The content to render for this nav control as a React node.
   */
  content?: ReactNode;
  /**
   * @deprecated Use {@link ChromeNavControl.content} instead.
   */
  mount?: MountPoint;
  /**
   * Placement for `chromeStyle === 'project'` (right-side controls only).
   * When omitted, project mode treats the control as `appBar` (application top bar / second row).
   * Use `projectHeader` for controls that belong in the global header strip only.
   */
  projectChrome?: ChromeNavControlProjectChrome;
}

/** @public */
export interface ChromeHelpMenuLink {
  title: string;
  href?: string;
  onClick?: () => void;
  dataTestSubj?: string;
}

/**
 * {@link ChromeNavControls | APIs} for registering new controls to be displayed in the navigation bar.
 *
 * @example
 * Register a left-side nav control with a React element.
 * ```jsx
 * chrome.navControls.registerLeft({
 *   content: <MyControl />
 * })
 * ```
 *
 * @public
 */
export interface ChromeNavControls {
  /** Register a nav control to be presented on the bottom-left side of the chrome header. */
  registerLeft(navControl: ChromeNavControl): void;

  /** Register a nav control to be presented on the top-right side of the chrome header. */
  registerRight(navControl: ChromeNavControl): void;

  /** Register a nav control to be presented on the top-center side of the chrome header. */
  registerCenter(navControl: ChromeNavControl): void;

  /**
   * Set the help menu links
   * @deprecated Use {@link ChromeStart.setHelpMenuLinks} instead
   */
  setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;

  /** @internal */
  getLeft$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getRight$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getCenter$(): Observable<ChromeNavControl[]>;

  /** @internal */
  getHelpMenuLinks$(): Observable<ChromeHelpMenuLink[]>;
}
