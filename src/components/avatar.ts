import { ConveyColor } from '../tokens/color.js'
import { ConveySize } from '../tokens/size.js'

/**
 * A circular identity representation — the web port of convey's `ConveyAvatar`. Shows
 * slotted content if provided (typically an `<img>`); falls back to `name`'s initials
 * otherwise — the same "one element, honest about what it has" spirit as the rest of
 * convey, rather than a broken-image icon when a picture hasn't loaded yet.
 *
 * ```html
 * <convey-avatar name="Ada Lovelace"></convey-avatar> <!-- renders "AL" -->
 *
 * <convey-avatar name="Ada Lovelace">
 *   <img src="ada.jpg" alt="" />
 * </convey-avatar>
 * ```
 *
 * Attributes:
 * - `name` — used for the initials fallback (up to two initials) when no slotted content
 *   is present.
 * - `size` — diameter, a CSS length. Defaults to `ConveySize.Component.IconXLarge` (2.5rem).
 * - `background-color` / `content-color` — CSS color values.
 */
export class ConveyAvatarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['name', 'size', 'background-color', 'content-color']
  }

  #shadow: ShadowRoot
  #circle: HTMLElement
  #initials: HTMLElement
  #slot: HTMLSlotElement

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .circle {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
        }
        ::slotted(*) { width: 100%; height: 100%; object-fit: cover; }
        .initials { font-weight: 500; }
      </style>
      <div class="circle" part="circle">
        <slot></slot>
        <span class="initials" part="initials"></span>
      </div>
    `
    this.#circle = this.#shadow.querySelector('.circle')!
    this.#initials = this.#shadow.querySelector('.initials')!
    this.#slot = this.#shadow.querySelector('slot')!
    this.#slot.addEventListener('slotchange', () => this.#syncFallback())
  }

  connectedCallback(): void {
    this.#render()
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.#render()
  }

  #render(): void {
    const size = this.getAttribute('size') ?? ConveySize.Component.IconXLarge
    const background = this.getAttribute('background-color') ?? ConveyColor.SecondaryContainer
    const content = this.getAttribute('content-color') ?? ConveyColor.OnSecondaryContainer

    this.#circle.style.width = size
    this.#circle.style.height = size
    this.#circle.style.backgroundColor = background
    this.#initials.style.color = content
    // Compose scales font size to 40% of the diameter (in its own unit); px is the only
    // unit CSS `font-size` can reliably compute a fraction of an arbitrary length string in.
    const px = Number.parseFloat(getComputedStyle(this.#circle).width || size)
    if (Number.isFinite(px)) this.#initials.style.fontSize = `${px * 0.4}px`

    this.#initials.textContent = this.#initialsOf(this.getAttribute('name'))
    this.#syncFallback()
  }

  #syncFallback(): void {
    const hasSlotted = this.#slot.assignedNodes({ flatten: true }).length > 0
    this.#initials.style.display = hasSlotted ? 'none' : ''
  }

  #initialsOf(name: string | null): string {
    if (!name) return ''
    return name
      .trim()
      .split(/\s+/)
      .filter((s) => s.length > 0)
      .slice(0, 2)
      .map((s) => s[0]!.toUpperCase())
      .join('')
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-avatar')) {
  customElements.define('convey-avatar', ConveyAvatarElement)
}
