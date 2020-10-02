import { NodeHtmlMarkdownOptions } from './options';
import { ElementNode } from './nodes';
import { nodeHtmlParserConfig } from './config';


/* ****************************************************************************************************************** */
// region: String Utils
/* ****************************************************************************************************************** */

export const trimNewLines = (s: string) => s.replace(/^\n+|\n+$/g, '');
export const surround = (source: string, surroundStr: string) => `${surroundStr}${source}${surroundStr}`;
export const isWhiteSpaceOnly = (s: string) => !/\S/.test(s);
export const getWhitespaceStats = (s: string, pos: 'start' | 'end'): { length: number, newLines: number } => {
  const regexp = new RegExp(String.raw`${truthyStr(pos === 'start','^')}(\r?\n\s*)+${truthyStr(pos === 'end', '$')}`);
  const whitespace = s.match(regexp);
  if (!whitespace) return { length: 0, newLines: 0 };
  return { length: whitespace[0].length, newLines: whitespace[0].match(/\r?\n/g)!.length }
}

/**
 * If value is truthy, returns `value` (or `v` if no `value` provided), otherwise, returns an empty string
 * @param v - Var to check for truthiness
 * @param value - Value to return if true
 */
export const truthyStr = (v: any, value?: string): string => v ? ((value !== undefined) ? value : String(v)) : '';

// endregion


/* ****************************************************************************************************************** */
// region: Object Helpers
/* ****************************************************************************************************************** */

/**
 * Verify that object has all provided keys
 * @param strict - Can *only* have the provided keys
 */
export const hasKeys = (o: object, keys: string[], strict?: boolean) => {
  if (typeof o !== 'object') return false;
  const objKeys = Object.keys(o);
  return !strict ? keys.every(k => objKeys.includes(k)) : (objKeys.sort().toString() === keys.sort().toString());
};

// endregion


/* ****************************************************************************************************************** */
// region: Parser
/* ****************************************************************************************************************** */

function tryParseWithNativeDom(html: string): ElementNode | undefined {
  try {
    if (!(window?.DOMParser && (new window.DOMParser()).parseFromString('', 'text/html'))) return void 0;
  } catch {
    return void 0;
  }

  /* Get a document */
  let doc: Document;
  try {
    doc = document.implementation.createHTMLDocument('').open()
  } catch (e) {
    const { ActiveXObject } = (<any>window);
    if (ActiveXObject) {
      const doc = ActiveXObject('htmlfile');
      doc.designMode = 'on';        // disable on-page scripts
      return doc.open();
    }
    throw e;
  }

  // Prepare document, ensuring we have a wrapper node
  doc.write('<node-html-markdown>' + html + '</node-html-markdown>');
  doc.close();

  return doc.documentElement;
}

const getNodeHtmlParser = () => {
  try {
    return require('node-html-parser').parse as typeof import('node-html-parser').parse
  } catch {
    return undefined;
  }
}

/**
 * Parser string to HTMLElement
 */
export function parseHTML(html: string, options: NodeHtmlMarkdownOptions): ElementNode {
  let nodeHtmlParse: ReturnType<typeof getNodeHtmlParser>;

  /* If specified, try to parse with native engine, fallback to node-html-parser */
  let el: ElementNode | undefined;
  if (options.preferNativeParser) {
    try {
      el = tryParseWithNativeDom(html);
    }
    catch (e) {
      nodeHtmlParse = getNodeHtmlParser();
      if (nodeHtmlParse) console.warn('Native DOM parser encountered an error during parse', e);
      throw e;
    }
  }
  else nodeHtmlParse = getNodeHtmlParser();

  return el || nodeHtmlParse!(html, nodeHtmlParserConfig);
}

// endregion
