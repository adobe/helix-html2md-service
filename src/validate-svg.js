/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import xml2js from 'xml2js';
import { toSISize } from '@adobe/helix-shared-string';

/**
 * SVG file size limit.
 */
const SVG_SIZE_LIMIT = 40 * 1024;

/**
 * Buffer factor applied to limits to allow for format overhead.
 * A factor of 1.1 means we allow 10% over the documented limit.
 */
const LIMIT_BUFFER_FACTOR = 1.1;

function getLimit(ctx, property, def) {
  const limit = Number.parseInt(ctx.attributes.config?.limits?.preview?.[property], 10);
  return Number.isNaN(limit) ? def : limit;
}

/**
 * Error information with code and message.
 */
export class SVGValidationError extends Error {
  fatal = true;
}

/**
 * Validate SVG. Checks whether neither script tags nor on attributes are contained.
 *
 * @param {AdminContext} ctx context
 * @param {string} resourcePath resource path
 * @param {Buffer} buf buffer
 * @throws {StatusCodeError} if an error occurs
 */
export async function validateSVG(ctx, buf) {
  const { log } = ctx;
  const limit = getLimit(ctx, 'maxSVGSize', SVG_SIZE_LIMIT);
  if (buf.byteLength > Math.ceil(limit * LIMIT_BUFFER_FACTOR)) {
    const $2 = toSISize(limit, 0);
    const $3 = toSISize(buf.byteLength, 1);

    throw new SVGValidationError(`SVG is larger than ${$2}: ${$3}`);
  }

  const checkForScriptOrHandlers = (node, path) => {
    const hasEventHandler = Object.keys(node.$ /* c8 ignore next */ ?? {})
      .some((attr) => attr.toLowerCase().startsWith('on'));

    if (node.script || hasEventHandler) {
      throw new SVGValidationError(`Script or event handler detected in SVG at: ${path}`);
    }
    Object.getOwnPropertyNames(node)
      .filter((name) => Array.isArray(node[name]))
      .forEach((name) => node[name].forEach((child, index) => checkForScriptOrHandlers(child, `${path}/${name}[${index}]`)));
  };

  let xml;

  try {
    xml = await xml2js.parseStringPromise(buf.toString('utf-8'), {
      strict: false, // allow escaped entity names, e.g. '&ns_extend;'
      normalizeTags: true, // lowercase all tag names
    });
    /* c8 ignore next 7 */
  } catch (e) {
    log.info(`Parsing SVG threw an error: ${e.message}`);
    throw new SVGValidationError('Unable to parse SVG XML');
  }
  if (!xml?.svg) {
    throw new SVGValidationError('Expected XML content with an SVG root item');
  }
  checkForScriptOrHandlers(xml.svg, '/svg');
}
