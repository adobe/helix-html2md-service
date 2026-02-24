/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import assert from 'assert';
import { SVGValidationError, validateSVG } from '../src/validate-svg.js';

const DEFAULT_CONTEXT = () => ({
  log: console,
  attributes: {
    config: {
      limits: {
        preview: {
          maxSVGSize: 10_000,
        },
      },
    },
  },
});

describe('Validate SVG Test', () => {
  it('validates an SVG that has a script tag', async () => {
    const contents = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 56 54" style="enable-background:new 0 0 56 54;" xml:space="preserve">
   <circle cx="40" cy="40" r="24" style="stroke:#006600; fill:#00cc00">
    <script>alert('I can do evil things...');</script>
  </circle>
</svg>`);
    await assert.rejects(validateSVG(DEFAULT_CONTEXT(), contents), new SVGValidationError('Script or event handler detected in SVG at: /svg/circle[0]'));
  });

  it('validates an SVG that has an onload handler', async () => {
    const contents = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
  <rect width="100" height="100" fill="red"/>
</svg>`);

    await assert.rejects(validateSVG(DEFAULT_CONTEXT(), contents), new SVGValidationError('Script or event handler detected in SVG at: /svg'));
  });

  it('validates an SVG that has an unexpected character', async () => {
    const contents = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
  <svg version="1.1" id="Adobe_Express_Logo" xmlns:x="&ns_extend;" xmlns:i="&ns_ai;" xmlns:graph="&ns_graphs;"
      xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 240 234"
      style="enable-background:new 0 0 240 234;" xml:space="preserve">
      <!-- foo ->
  </svg>`);
    await assert.rejects(validateSVG(DEFAULT_CONTEXT(), contents), new SVGValidationError('Unable to parse SVG XML'));
  });

  it('validates an SVG', async () => {
    const contents = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 56 54" style="enable-background:new 0 0 56 54;" xml:space="preserve">
  <circle cx="40" cy="40" r="24" style="stroke:#006600; fill:#00cc00"/>
</svg>`);

    const ctx = DEFAULT_CONTEXT();
    ctx.attributes.config.limits.preview.maxSVGSize = 10;

    await assert.rejects(validateSVG(ctx, contents), new SVGValidationError('SVG is larger than 10B: 313B'));
  });
});
