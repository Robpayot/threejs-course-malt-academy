import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'

import dat from 'dat.gui'

const ASSETS = `${window.location.href}/img/`

export default class Scene {
  constructor(el) {
    this.canvas = el

    this.load()
  }

  load() {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(`${ASSETS}texture.png`, result => {
      this.boxTexture = result
      this.init()
    })

    this.matcapTexture = textureLoader.load(`${ASSETS}matcap.png`)
  }

  init = () => {
    this.buildGui()
    this.buildStats()
    this.buildScene()
    this.buildRender()
    this.buildCamera()
    this.buildControls()
    this.buildAxesHelper()
    this.buildBox()
    this.buildSphere()
    this.buildCone()
    this.buildLight()

    this.handleResize()

    // start RAF
    this.events()
  }

  buildGui() {
    this.gui = new dat.GUI()

    this.guiController = {
      spotlightX: 0.2,
      spotlightIntensity: 1
    }
    this.gui
      .add(this.guiController, 'spotlightX', -10, 10)
      .name('spotlight X pos')
      .onChange(this.handleGuiChange)
    this.gui
      .add(this.guiController, 'spotlightIntensity', 0, 3)
      .name('spotlight power')
      .onChange(this.handleGuiChange)
  }

  buildStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  buildScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x122145)
  }

  buildRender() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
  }

  buildCamera() {
    const aspectRatio = this.width / this.height
    const fieldOfView = 60
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.updateProjectionMatrix()
    this.camera.position.z = 10
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  buildControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    // this.controls.enableDamping = true
  }

  /**
   * Axes Helper
   */
  buildAxesHelper() {
    const axesHelper = new THREE.AxesHelper(3)
    this.scene.add(axesHelper)
  }

  buildBox() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ map: this.boxTexture })

    this.box = new THREE.Mesh(geometry, material)
    this.box.position.set(-3, 0, 0)
    this.scene.add(this.box)
  }

  buildSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32)
    const material = new THREE.MeshPhongMaterial({ color: 0xeb142a })
    this.sphere = new THREE.Mesh(geometry, material)
    this.sphere.position.set(0, 0, 0)
    this.scene.add(this.sphere)
  }

  buildCone() {
    const geometry = new THREE.ConeGeometry(1, 2, 120)
    const material = new THREE.MeshMatcapMaterial({ matcap: this.matcapTexture })
    this.cone = new THREE.Mesh(geometry, material)
    this.cone.position.set(3, 0, 0)
    this.scene.add(this.cone)
  }

  buildLight() {
    this.pointLight = new THREE.PointLight(0xffffff, 1, 100)
    this.pointLight.position.set(2, 5, 5)
    this.scene.add(this.pointLight)
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.handleRAF(0)
  }

  // EVENTS

  handleRAF = now => {
    // now: time in ms
    this.render(now)
    this.raf = window.requestAnimationFrame(this.handleRAF)

    this.box.rotation.x += 1 / 500
    this.box.rotation.y += 1 / 500
    this.cone.rotation.x += 1 / 500
    this.cone.rotation.y += 1 / 500
    this.sphere.rotation.x += 1 / 500
    this.sphere.rotation.y += 1 / 500
  }

  handleGuiChange = () => {
    this.pointLight.position.x = this.guiController.spotlightX
    this.pointLight.intensity = this.guiController.spotlightIntensity
  }

  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Update camera
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1

    this.renderer.setPixelRatio(DPR)
    this.renderer.setSize(this.width, this.height)
  }

  // Render
  render = now => {
    this.stats.begin()

    if (this.controls) this.controls.update() // for damping
    this.renderer.render(this.scene, this.camera)

    this.stats.end()
  }
}
