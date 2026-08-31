import { safeAnimate, toCss } from '../tokens/motion.js'
import { ConveyColor } from '../tokens/color.js'
import { ConveyShape } from '../tokens/shape.js'
import { ConveySize } from '../tokens/size.js'
import { grammarOf } from '../system.js'

/**
 * A compact, selectable tag — the web port of convey's `ConveyChip`. Selected/unselected is
 * a morph (background and content color), the same "the element IS its state" principle
 * rather than a swapped background image.
 *
 * ```html
 * <convey-chip selected>
 *   <span slot="leading">🏷️</span>
 *   Draft
 * </convey-chip>
 * ```
 *
 * Attributes:
 * - `selected` — presence toggles the morph between selected/unselected colors.
 * - `clickable` — presence makes the chip body dispatch a `convey-click` event on click/Enter/Space.
 * - `removable` — presence shows a trailing "×" that dispatches a `convey-remove` event, not
 *   wired to any particular removal mechanism itself — a single chip doesn't know whether its
 *   removal should be reversible; listen for `convey-remove` and decide that yourself.
 *
 * Slots: default (the label), `leading` (optional icon/avatar before the label).
 */
export class ConveyChipElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['selected']
  }

  #shadow: ShadowRoot
  #chip: HTMLElement
  #removeButton: HTMLElement | null = null

  constructor() {
    super()
    this.#shadow = this.attachShadow({ mode: 'open' })
    this.#shadow.innerHTML = `
      <style>
        :host { display: inline-block; }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: ${ConveySize.XSmall};
          padding: ${ConveySize.Small} ${ConveySize.Medium};
          border-radius: ${ConveyShape.Circle.borderRadius};
          cursor: default;
          user-select: none;
        }
        :host([clickable]) .chip { cursor: pointer; }
        .remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${ConveySize.Component.IconSmall};
          height: ${ConveySize.Component.IconSmall};
          border-radius: 50%;
          border: none;
          background: transparent;
          font: inherit;
          cursor: pointer;
          padding: 0;
        }
        .remove:active { transform: scale(0.85); }
      </style>
      <div class="chip" part="chip" tabindex="-1">
        <slot name="leading"></slot>
        <slot></slot>
      </div>
    `
    this.#chip = this.#shadow.querySelector('.chip')!
  }

  connectedCallback(): void {
    this.#applyColors(false)
    this.#syncClickable()
    this.#syncRemovable()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'selected') this.#applyColors(true)
  }

  #applyColors(animate: boolean): void {
    const selected = this.hasAttribute('selected')
    const background = selected ? ConveyColor.SecondaryContainer : ConveyColor.SurfaceContainerHigh
    const content = selected ? ConveyColor.OnSecondaryContainer : ConveyColor.OnSurfaceVariant

    if (animate) {
      const { durationMs, easing } = toCss(grammarOf(this).get('morph'))
      const fromBg = getComputedStyle(this.#chip).backgroundColor
      const fromColor = getComputedStyle(this.#chip).color
      safeAnimate(
        this.#chip,
        [
          { backgroundColor: fromBg, color: fromColor },
          { backgroundColor: background, color: content },
        ],
        { duration: durationMs, easing, fill: 'forwards' },
      )
    } else {
      this.#chip.style.backgroundColor = background
      this.#chip.style.color = content
    }
  }

  #syncClickable(): void {
    if (!this.hasAttribute('clickable')) return
    this.#chip.setAttribute('role', 'button')
    this.#chip.setAttribute('tabindex', '0')
    this.#chip.addEventListener('click', () => this.dispatchEvent(new CustomEvent('convey-click')))
    this.#chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        this.dispatchEvent(new CustomEvent('convey-click'))
      }
    })
  }

  #syncRemovable(): void {
    if (!this.hasAttribute('removable') || this.#removeButton) return
    const button = document.createElement('button')
    button.className = 'remove'
    button.setAttribute('aria-label', 'Remove')
    button.textContent = '×'
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      this.dispatchEvent(new CustomEvent('convey-remove'))
    })
    this.#chip.appendChild(button)
    this.#removeButton = button
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('convey-chip')) {
  customElements.define('convey-chip', ConveyChipElement)
}
