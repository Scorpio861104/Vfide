declare module '@metamask/jazzicon' {
  /**
   * @param diameter — icon size in pixels
   * @param seed — numeric seed (e.g. from address lower bits)
   * @returns SVGElement
   */
  function jazzicon(diameter: number, seed: number): SVGElement;
  export default jazzicon;
}
