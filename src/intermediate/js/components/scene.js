import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'

const ASSETS = `${window.location.href}/img/`

const LINE_LENGTH = 10
const COLUMN_LENGTH = 10
const DELAY_RESET_SPHERE = 500
const WAVE_FREQUENCE = 900
const WAVE_AMPLITUDE = 2

export default class Scene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  matcapTexture
  spheres
  mouse
  raycaster

  constructor(el) {
    this.canvas = el

    this.load()
  }

  /**
   * Load our matcapTexture
   */
  load() {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(`${ASSETS}matcap.png`, result => {
      this.matcapTexture = result
      this.init()
    })
  }

  /**
   * Init everything
   */
  init = () => {
    this.setStats()
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()
    this.setSpheres()
    this.setRaycaster()

    this.handleResize()

    // start RAF
    this.events()
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
    const fieldOfView = 80
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.y = 3
    this.camera.position.x = 5
    this.camera.position.z = 5

    this.scene.add(this.camera)
  }

  /**
   * Raycast to interracts with objects using our mouse
   * https://threejs.org/docs/?q=raycas#api/en/core/Raycaster
   */
  setRaycaster() {
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
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
   * Build our spheres by lines and columns
   */
  setSpheres() {
    this.spheres = []
    const geometry = new THREE.SphereGeometry(0.5, 32, 32)

    for (let i = 0; i < LINE_LENGTH; i++) {
      for (let y = 0; y < COLUMN_LENGTH; y++) {
        const material = new THREE.MeshMatcapMaterial({ matcap: this.matcapTexture, transparent: true })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.x = i - LINE_LENGTH / 2 + 0.5
        mesh.position.z = y - COLUMN_LENGTH / 2 + 0.5
        this.spheres.push(mesh)
        this.scene.add(mesh)
      }
    }
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.handleRAF(0)
    window.addEventListener('mousemove', this.handleMousemove)
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

    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.spheres)

    // hideSphereMaterial on raycaster detection
    for (let i = 0; i < intersects.length; i++) {
      if (!intersects[i].object.isIntersected) {
        intersects[i].object.isIntersected = true
        this.hideSphereMaterial(intersects[i].object)
      }
    }

    // Animate spheres as a wave based on current time
    for (let i = 0; i < this.spheres.length; i++) {
      const sphere = this.spheres[i]
      sphere.position.y =
        (Math.sin(now / WAVE_FREQUENCE + sphere.position.x * (LINE_LENGTH * COLUMN_LENGTH)) +
          Math.sin(now / WAVE_FREQUENCE + sphere.position.z * (LINE_LENGTH * COLUMN_LENGTH))) /
        WAVE_AMPLITUDE
    }
  }

  /**
   * Hide our mesh material on mouse hover
   * @param {Object} object mesh instersected by the mouse
   */
  hideSphereMaterial(object) {
    object.material.opacity = 0
    setTimeout(() => {
      object.material.opacity = 1
      object.isIntersected = false
    }, DELAY_RESET_SPHERE)
  }

  /**
   *  Store the position of the mouse based on the window
   * @param {MouseInput} event mouse event
   */
  handleMousemove = event => {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    this.mouse.x = (event.clientX / this.width) * 2 - 1
    this.mouse.y = -(event.clientY / this.height) * 2 + 1
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
