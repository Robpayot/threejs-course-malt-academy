import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GeometryUtils } from '../utils/GeometryUtils.js'
import Stats from 'stats-js'
import model from '../../models/suzanne.obj'
import dat from 'dat.gui'
const ASSETS = './advanced/img/'

console.log(GeometryUtils)

const NB_PARTICLES = 4000

export default class Scene {
  constructor(el) {
    this.canvas = el

    this.load()
    console.log(model)
  }

  load() {
    // instantiate a loader
    const objLoader = new OBJLoader()

    objLoader.load(model, result => {
      // this.subjects['suzanne'].obj = result
      this.model = result

      const textureLoader = new THREE.TextureLoader()
      textureLoader.load(`${ASSETS}particle-2.png`, result => {
        this.particleTexture = result
        this.init()
      })
    })
  }

  init = () => {
    this.gui = new dat.GUI()

    this.guiController = {
      nb_particles: NB_PARTICLES,
    }

    this.gui
      .add(this.guiController, 'nb_particles', 0, 10000)
      .name('nb particles')
      .onChange(this.onGuiChange)

    this.buildStats()
    this.buildScene()
    this.buildRender()
    this.buildCamera()
    this.buildControls()
    this.buildAxesHelper()
    this.buildModel()

    this.handleResize()

    // start RAF
    this.events()
  }

  buildStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  buildScene() {
    this.scene = new THREE.Scene()
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
    this.camera.position.y = 5
    this.camera.position.x = -5
    this.camera.position.z = 5
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  buildControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    // this.controls.enableDamping = true
  }

  buildModel() {
    const randomPoints = GeometryUtils.randomPointsInBufferGeometry(
      this.model.children[0].geometry,
      this.guiController.nb_particles,
    )
    const arrayOfPoints = [...randomPoints].map(el => el.toArray()).flat(1) // transform THREE.Vector3(x,y,z) into [x,y,z] for BufferAttribute
    const vertices = new Float32Array(arrayOfPoints)
    const randomizedGeometry = new THREE.BufferGeometry()
    // itemSize = 3 because there are 3 values (components) per vertex
    randomizedGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

    // randomizedGeometry
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.04,
      depthTest: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
      map: this.particleTexture,
    })

    const points = new THREE.Points(randomizedGeometry, material)
    // this.scene.add(this.model)
    this.scene.add(points)
  }

  /**
   * Axes Helper
   */
  buildAxesHelper() {
    const axesHelper = new THREE.AxesHelper(3)
    this.scene.add(axesHelper)
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

  onGuiChange = () => {
    this.destroy()
    this.buildModel()
  }

  // Render
  render = now => {
    this.stats.begin()

    if (this.controls) this.controls.update() // for damping
    this.renderer.render(this.scene, this.camera)

    this.stats.end()
  }

  /**
   * Destroy objects in scene
   */
  destroy() {
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const object = this.scene.children[i]
      // destroy all meshes
      object.geometry?.dispose()
      object.material?.dispose()
      this.scene.remove(object)
    }
  }
}
