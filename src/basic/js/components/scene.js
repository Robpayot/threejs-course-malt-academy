import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'

import dat from 'dat.gui'

const ASSETS = `${window.location.href}/img/`

export default class Scene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  boxTexture
  matcapTexture
  gui
  guiController
  box
  sphere
  cone
  pointLight

  constructor(el) {
    this.canvas = el

    this.load()
    this.init()
  }

  /**
   * Load our textures with the TextureLoader
   * https://threejs.org/docs/?q=textureLo#api/en/loaders/TextureLoader
   */
  load() {
    const textureLoader = new THREE.TextureLoader()
    this.boxTexture = textureLoader.load(`${ASSETS}texture.png`)
    this.matcapTexture = textureLoader.load(`${ASSETS}matcap.png`)
  }

  init = () => {
    this.setGui()
    this.setStats()
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()
    this.setAxesHelper()
    this.setBox()
    this.setSphere()
    this.setCone()
    this.setLight()

    this.handleResize()

    // start RAF
    this.events()
  }

  /**
   * This is our scene, we'll add any object
   * https://threejs.org/docs/?q=scene#api/en/scenes/Scene
   */
  setScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x122145)
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRender() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
  }

  /**
   * Our Perspective camera, this is the point of view that we'll have
   * of our scene.
   * A perscpective camera is mimicing the human eyes so something far we'll
   * look smaller than something close
   * https://threejs.org/docs/?q=pers#api/en/cameras/PerspectiveCamera
   */
  setCamera() {
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

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    // this.controls.enableDamping = true
  }

  /**
   * Axes Helper
   * https://threejs.org/docs/?q=Axesh#api/en/helpers/AxesHelper
   */
  setAxesHelper() {
    const axesHelper = new THREE.AxesHelper(3)
    this.scene.add(axesHelper)
  }

  /**
   * Create a BoxGeometry
   * https://threejs.org/docs/?q=box#api/en/geometries/BoxGeometry
   * with a Basic material
   * https://threejs.org/docs/?q=mesh#api/en/materials/MeshBasicMaterial
   */
  setBox() {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ map: this.boxTexture })

    this.box = new THREE.Mesh(geometry, material)
    this.box.position.set(-3, 0, 0)
    this.scene.add(this.box)
  }

  /**
   * Create a SphereGeometry
   * https://threejs.org/docs/?q=sphere#api/en/geometries/SphereGeometry
   * with a Phong material
   * https://threejs.org/docs/?q=meshp#api/en/materials/MeshPhongMaterial
   */
  setSphere() {
    const geometry = new THREE.SphereGeometry(1, 32, 32)
    const material = new THREE.MeshPhongMaterial({ color: 0xeb142a })
    this.sphere = new THREE.Mesh(geometry, material)
    this.sphere.position.set(0, 0, 0)
    this.scene.add(this.sphere)
  }

  /**
   * Create a ConeGeometry
   * https://threejs.org/docs/?q=sphere#api/en/geometries/SphereGeometry
   * with a Matcap material and texture
   * https://threejs.org/docs/?q=matca#api/en/materials/MeshMatcapMaterial
   */
  setCone() {
    const geometry = new THREE.ConeGeometry(1, 2, 120)
    const material = new THREE.MeshMatcapMaterial({ matcap: this.matcapTexture })
    this.cone = new THREE.Mesh(geometry, material)
    this.cone.position.set(3, 0, 0)
    this.scene.add(this.cone)
  }

  /**
   * Set a point light in the scene to illuminate our MeshPhongMaterial
   * https://threejs.org/docs/?q=point#api/en/lights/PointLight
   */
  setLight() {
    this.pointLight = new THREE.PointLight(0xffffff, 1, 100)
    this.pointLight.position.set(2, 5, 5)
    this.scene.add(this.pointLight)
  }

  /**
   * add dat.gui controls
   * https://github.com/dataarts/dat.gui
   */
  setGui() {
    this.gui = new dat.GUI()

    this.guiController = {
      spotlightX: 0.2,
      spotlightIntensity: 1,
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

  /**
   * Build stats to display fps
   */
  setStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.handleRAF(0)
  }

  // EVENTS

  /**
   * Request animation frame
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawed here
   * @param {Number} now
   */
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

  /**
   * On GUI change, update spotlight poisiton
   */
  handleGuiChange = () => {
    this.pointLight.position.x = this.guiController.spotlightX
    this.pointLight.intensity = this.guiController.spotlightIntensity
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
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

  /**
   * Render our scene
   * @param {Number} now current time
   */
  render = now => {
    this.stats.begin()

    if (this.controls) this.controls.update() // for damping
    this.renderer.render(this.scene, this.camera)

    this.stats.end()
  }
}
