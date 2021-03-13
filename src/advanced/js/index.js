// Scene
import Scene from './components/scene'
import Slider from './components/slider'

;(() => {
  // scene
  const sceneEl = document.querySelector('[data-scene]')
  new Scene(sceneEl)

  // slider
  const sliderEl = document.querySelector('[data-slider]')
  new Slider(sliderEl)
})()
