import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { GeometryUtils } from '../utils/GeometryUtils'
import { randomFloat } from '../utils/math'
import { outQuad, inOutQuad } from '../utils/ease'
import Stats from 'stats-js'
import wolf from '../../models/wolf.obj'
import deer from '../../models/deer.obj'
import cat from '../../models/cat.obj'
import dat from 'dat.gui'

const ASSETS = `${window.location.href}/img/`
const NB_PARTICLES = 6000
const EXPLODE_DURATION = 1300 // in miliseconds
const IMPLODE_DURATION = 1700
const ROTATION_SPEED = 1 / 400
const EXPLOSION_FORCE = 4.5

export default class Scene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  gui
  guiController
  modelIndex
  nextModelIndex
  models
  modelsScale
  modelAnimations
  textures
  modelsStore
  modelsStore
  meshPoints
  implodeStart
  explodeStart
  isGoingNext
  isGoingPrev

  constructor(el) {
    this.canvas = el

    this.modelIndex = 0
    this.nextModelIndex = 0
    this.models = []
    this.modelsScale = [300, 200, 200]
    this.modelAnimations = []
    this.textures = []
    //  model object where we store the loaded models with a name
    this.modelsStore = {}

    //  model object where we store the loaded textures with a name
    this.texturesStore = {}

    this.load([
      { type: 'obj', url: deer, name: 'deer' },
      { type: 'obj', url: wolf, name: 'wolf' },
      { type: 'obj', url: cat, name: 'cat' },
      { type: 'texture', url: `${ASSETS}particle.png`, name: 'particle' },
    ])
  }

  /**
   * Load textures or object and put them in a corresponding store
   * @param {Object} objects
   */
  load = objects => {
    const promises = []
    const objLoader = new OBJLoader()
    const textureLoader = new THREE.TextureLoader()

    for (let i = 0; i < objects.length; i++) {
      const { type, url, name } = objects[i]

      if (type === 'obj') {
        // load OBJ
        // add name to get array in right order
        promises.push(
          new Promise(resolve => {
            objLoader.load(url, result => {
              this.modelsStore[name] = result
              resolve(result)
            })
          }),
        )
      } else if (type === 'texture') {
        // load Textures
        promises.push(
          new Promise(resolve => {
            textureLoader.load(url, result => {
              this.texturesStore[name] = result
              resolve(result)
            })
          }),
        )
      }
    }

    Promise.all(promises).then(this.init)
  }

  /**
   * Init our scene
   */
  init = () => {
    this.setGui()
    this.setStats()
    this.setScene()
    this.setRenderer()
    this.setCamera()
    // Order models 'deer', 'wolf', 'cat' whatever the loading order has given
    this.models = [this.modelsStore['deer'], this.modelsStore['wolf'], this.modelsStore['cat']]
    for (let i = 0; i < this.models.length; i++) {
      this.setPointsAnimation(i)
    }
    this.setMeshPoint()

    this.handleResize()

    // start RAF
    this.events()
  }

  /**
   * Set up gui
   */
  setGui() {
    this.gui = new dat.GUI()

    this.guiController = {
      color: 0x000000,
      size: 0.04,
      opacity: 0.7,
    }

    this.gui
      .addColor(this.guiController, 'color', 0, 10000)
      .name('particles colors')
      .onChange(this.handleGuiChange)
    this.gui
      .add(this.guiController, 'size', 0.0, 0.08)
      .name('particles size')
      .onChange(this.handleGuiChange)
    this.gui
      .add(this.guiController, 'opacity', 0.0, 1)
      .name('particles opacity')
      .onChange(this.handleGuiChange)
  }

  /**
   * Set up stats
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
    this.scene.background = new THREE.Color(0xffffff)
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRenderer() {
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
    this.camera.position.y = 3.5
    this.camera.position.x = 0
    this.camera.position.z = 8
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  /**
   * Create an initial position and a final position (target) for each
   * vertices (3D points) of our model
   * This will help us moving all the vertices from one 3D space place to another
   * @param {Number} index
   */
  setPointsAnimation(index) {
    const unscale = this.modelsScale[index]

    // Display a specific number of points inside our model Geometry
    // These points are spread randomly inside.
    // Here we are using an utils that doing the math for us
    const randomPoints = GeometryUtils.randomPointsInBufferGeometry(
      this.models[index].children[0].geometry,
      NB_PARTICLES,
    )

    // create an animation "target to go" for each particles

    const pointsAnimation = []
    randomPoints.forEach(vector3 => {
      const initPosition = new THREE.Vector3(vector3.x / unscale, vector3.y / unscale, vector3.z / unscale)
      const targetPosition = new THREE.Vector3(
        randomFloat(-EXPLOSION_FORCE, EXPLOSION_FORCE),
        randomFloat(-EXPLOSION_FORCE, EXPLOSION_FORCE),
        randomFloat(-EXPLOSION_FORCE, EXPLOSION_FORCE),
      )
      const animation = {
        initPosition,
        targetPosition: targetPosition.add(initPosition),
      }

      pointsAnimation.push(animation)
    })

    this.modelAnimations.push(pointsAnimation)
  }

  /**
   * Creating our only mesh
   * We're using first the points animation init position of our first model (deer)
   * We're using the PointsMaterial which is creating particles for each vertices of our
   * geometry
   * Then we add it to the scene
   */
  setMeshPoint() {
    const pointsAnimation = this.modelAnimations[0]
    const initPositions = pointsAnimation.map(item => item.initPosition)
    // Transform this list of point into an Float32Array
    const arrayOfPoints = [...initPositions].map(item => item.toArray()).flat(1) // transform THREE.Vector3(x,y,z) into [x,y,z] for BufferAttribute
    const vertices = new Float32Array(arrayOfPoints)
    // Create a new bufferGeometry with our Float32Array
    const randomizedGeometry = new THREE.BufferGeometry()
    // itemSize = 3 because there are 3 values (components) per vertex
    randomizedGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

    // Use the THREE Point Material to display particles based on our bufferGeometry
    const material = new THREE.PointsMaterial({
      color: this.guiController.color,
      size: this.guiController.size,
      depthTest: false,
      transparent: true,
      // blending: THREE.AdditiveBlending,
      opacity: this.guiController.opacity,
      map: this.texturesStore['particle'],
    })

    this.meshPoints = new THREE.Points(randomizedGeometry, material)
    this.meshPoints.position.y = -1.2
    this.meshPoints.rotation.y = THREE.MathUtils.degToRad(-90)

    this.scene.add(this.meshPoints)
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('go-prev', this.goPrev)
    window.addEventListener('go-next', this.goNext)
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
  }

  /**
   * animate previous model
   */
  goPrev = () => {
    this.updateIndexAnimated()

    this.nextModelIndex = this.modelIndex === 0 ? this.models.length - 1 : this.modelIndex - 1
    this.explodeStart = performance.now()
    this.implodeStart = null
    this.isGoingNext = false
    this.isGoingPrev = true
  }

  /**
   * animate next model
   */
  goNext = () => {
    this.updateIndexAnimated()

    this.nextModelIndex = this.modelIndex === this.models.length - 1 ? 0 : this.modelIndex + 1
    this.explodeStart = performance.now()
    this.implodeStart = null
    this.isGoingNext = true
    this.isGoingPrev = false
  }

  /**
   *  Prevent model index conflict if we click while there's still an animation
   */
  updateIndexAnimated() {
    if (this.isGoingPrev) {
      this.modelIndex = this.modelIndex === 0 ? this.models.length - 1 : this.modelIndex - 1
    } else if (this.isGoingNext) {
      // directly update index to next animation
      this.modelIndex = this.modelIndex === this.models.length - 1 ? 0 : this.modelIndex + 1
    }
  }

  /**
   * On resize
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
   * On GUI change
   */
  handleGuiChange = () => {
    //set the color in the object
    this.meshPoints.material.color = new THREE.Color(this.guiController.color)
    this.meshPoints.material.size = this.guiController.size
    this.meshPoints.material.opacity = this.guiController.opacity
  }

  /**
   * Make particules explode in randomDirections
   * @param {Number} now current time
   */
  explode(now) {
    const positions = this.meshPoints.geometry.getAttribute('position')

    const percent = (now - this.explodeStart) / EXPLODE_DURATION
    if (percent < 1.0) {
      const animations = this.modelAnimations[this.modelIndex]
      for (let i = 0; i < positions.count; i++) {
        const v = animations[i]
        positions.array[i * 3 + 0] = v.initPosition.x + (v.targetPosition.x - v.initPosition.x) * outQuad(percent)
        positions.array[i * 3 + 1] = v.initPosition.y + (v.targetPosition.y - v.initPosition.y) * outQuad(percent)
        positions.array[i * 3 + 2] = v.initPosition.z + (v.targetPosition.z - v.initPosition.z) * outQuad(percent)
      }
    } else {
      this.explodeStart = null
      this.implodeStart = performance.now()
    }

    positions.needsUpdate = true
  }

  /**
   * Make particules implode in randomDirections
   * @param {Number} now current time
   */
  implode(now) {
    const positions = this.meshPoints.geometry.getAttribute('position')

    const percent = (now - this.implodeStart) / IMPLODE_DURATION
    if (percent < 1) {
      const animations = this.modelAnimations[this.modelIndex]
      const nextAnimations = this.modelAnimations[this.nextModelIndex]
      for (let i = 0; i < positions.count; i++) {
        const v = animations[i]
        const vNext = nextAnimations[i]
        positions.array[i * 3 + 0] =
          v.targetPosition.x + (vNext.initPosition.x - v.targetPosition.x) * inOutQuad(percent)
        positions.array[i * 3 + 1] =
          v.targetPosition.y + (vNext.initPosition.y - v.targetPosition.y) * inOutQuad(percent)
        positions.array[i * 3 + 2] =
          v.targetPosition.z + (vNext.initPosition.z - v.targetPosition.z) * inOutQuad(percent)
      }
    } else {
      this.implodeStart = null
      this.modelIndex = this.nextModelIndex
      this.isGoingPrev = false
      this.isGoingNext = false
    }

    positions.needsUpdate = true
  }

  /**
   * Render our scene
   * @param {Number} now current time
   */
  render = now => {
    this.stats.begin()

    // render explode animation
    if (this.explodeStart) {
      this.explode(now)
    }

    // render implode animation
    if (this.implodeStart) {
      this.implode(now)
    }

    // Rotate our mesh
    this.meshPoints.rotation.y -= ROTATION_SPEED

    if (this.controls) this.controls.update() // for damping
    this.renderer.render(this.scene, this.camera)

    this.stats.end()
  }

  /**
   * Not used in this tutorial but to keep in mind
   * if you need to dynamically remove and readd the scene
   * Destroy all objects in scene
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
