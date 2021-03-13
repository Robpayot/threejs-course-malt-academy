const TITLES = ['Deer', 'Wolf', 'Cat']

export default class Slider {
  constructor(el) {
    this.el = el

    this.prevEl = this.el.querySelector('[data-slider-prev]')
    this.nextEl = this.el.querySelector('[data-slider-next]')
    this.titleEl = this.el.querySelector('[data-slider-title]')

    this.index = 0

    this.updateTitle()

    this.events()
  }

  events() {
    this.prevEl.addEventListener('click', this.goPrev)
    this.nextEl.addEventListener('click', this.goNext)
  }

  goPrev = () => {
    // emit event
    window.dispatchEvent(new window.CustomEvent('go-prev'))
    this.index = this.index === 0 ? TITLES.length - 1 : this.index - 1
    this.updateTitle()
  }

  goNext = () => {
    // emit event
    window.dispatchEvent(new window.CustomEvent('go-next'))
    this.index = this.index === TITLES.length - 1 ? 0 : this.index + 1
    this.updateTitle()
  }

  updateTitle() {
    const titleChars = TITLES[this.index].split('')
    this.titleEl.innerHTML = ''
    this.titleEl.classList.remove('appear')
    titleChars.forEach(char => {
      const span = document.createElement('span')
      span.classList.add('title__char')
      span.innerHTML = char

      this.titleEl.appendChild(span)
    })

    setTimeout(() => {
      this.titleEl.classList.add('appear')
    }, 400)

    // this.titleEl
  }
}
