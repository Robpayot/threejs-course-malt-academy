import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'

const ASSETS = `${window.location.href}/img/`

const LINE_LENGTH = 10
const COLUMN_LENGTH = 10
const DELAY_RESET_SPHERE = 500

export default class Scene {
  constructor(el) {
    this.canvas = el

    this.load()
  }

  load() {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(`${ASSETS}matcap.png`, result => {
      this.matcapTexture = result
      this.init()
    })
  }

  init = () => {
    this.buildStats()
    this.buildScene()
    this.buildRender()
    this.buildCamera()
    this.buildControls()
    // this.buildAxesHelper()
    this.buildBoxes()
    this.buildRaycaster()

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
    const fieldOfView = 80
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.updateProjectionMatrix()
    this.camera.position.y = 3
    this.camera.position.x = 5
    this.camera.position.z = 5
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  buildRaycaster() {
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
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

  buildBoxes() {
    this.boxes = []
    // const geometry = new THREE.BoxGeometry(1, 1, 1)
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)

    for (let i = 0; i < LINE_LENGTH; i++) {
      for (let y = 0; y < COLUMN_LENGTH; y++) {
        const material = new THREE.MeshMatcapMaterial({ matcap: this.matcapTexture, transparent: true })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.x = i - LINE_LENGTH / 2 + 0.5
        mesh.position.z = y - COLUMN_LENGTH / 2 + 0.5
        this.boxes.push(mesh)
        this.scene.add(mesh)
      }
    }
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.handleRAF(0)
    window.addEventListener('mousemove', this.handleMousemove)
  }

  // EVENTS

  handleRAF = now => {
    // now: time in ms
    this.render(now)
    this.raf = window.requestAnimationFrame(this.handleRAF)
    const fq = 900
    const amplitude = 2

    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.boxes)

    for (let i = 0; i < intersects.length; i++) {
      if (!intersects[i].object.isIntersected) {
        intersects[i].object.isIntersected = true
        this.changeSphereMaterial(intersects[i].object)
      }
    }

    for (let i = 0; i < this.boxes.length; i++) {
      const box = this.boxes[i]
      box.position.y =
        (Math.sin(now / fq + box.position.x * 100) + Math.sin(now / fq + box.position.z * 100)) / amplitude
    }
  }

  changeSphereMaterial(object) {
    object.material.opacity = 0
    setTimeout(() => {
      object.material.opacity = 1
      object.isIntersected = false
    }, DELAY_RESET_SPHERE)
  }

  handleMousemove = event => {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    this.mouse.x = (event.clientX / this.width) * 2 - 1
    this.mouse.y = -(event.clientY / this.height) * 2 + 1
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
