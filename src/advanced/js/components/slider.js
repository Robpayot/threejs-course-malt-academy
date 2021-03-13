import createCustomEvent from '../utils/createCustomEvent'

export default class Slider {
  constructor(el) {
    this.el = el

    this.prevEl = this.el.querySelector('[data-slider-prev]')
    this.nextEl = this.el.querySelector('[data-slider-next]')

    console.log(this.el)

    this.events()
  }

  events() {

    this.prevEl.addEventListener('click', this.goPrev)
    this.nextEl.addEventListener('click', this.goNext)
  }

  goPrev() {
    // emit event
    window.dispatchEvent(new window.CustomEvent('go-prev'))
  }

  goNext() {
    // emit event
    window.dispatchEvent(new window.CustomEvent('go-next'))
  }
}
