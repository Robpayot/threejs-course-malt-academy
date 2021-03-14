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
  constructor(el) {
    this.canvas = el

    this.modelIndex = 0
    this.nextModelIndex = 0
    this.models = []
    this.modelsScale = [300, 200, 200]
    this.modelAnimations = []
    this.textures = []

    this.load([
      { type: 'obj', url: deer },
      { type: 'obj', url: wolf },
      { type: 'obj', url: cat },
      { type: 'texture', url: `${ASSETS}particle.png` },
    ])
  }

  load = objects => {
    const promises = []
    const objLoader = new OBJLoader()
    const textureLoader = new THREE.TextureLoader()

    for (let i = 0; i < objects.length; i++) {
      const { type, url } = objects[i]

      if (type === 'obj') {
        // load OBJ
        promises.push(
          new Promise(resolve => {
            objLoader.load(url, result => {
              this.models.push(result)
              resolve(result)
            })
          }),
        )
      } else if (type === 'texture') {
        // load Textures
        promises.push(
          new Promise(resolve => {
            textureLoader.load(url, result => {
              this.textures.push(result)
              resolve(result)
            })
          }),
        )
      }
    }

    Promise.all(promises).then(this.init)
  }

  init = () => {
    this.buildGui()
    this.buildStats()
    this.buildScene()
    this.buildRender()
    this.buildCamera()
    for (let i = 0; i < this.models.length; i++) {
      this.buildPointsAnimation(i)
    }
    this.buildMeshPoint()

    this.handleResize()

    // start RAF
    this.events()
  }

  buildGui() {
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

  buildStats() {
    this.stats = new Stats()
    this.stats.showPanel(0)
    document.body.appendChild(this.stats.dom)
  }

  buildScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0xffffff)
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
    this.camera.position.y = 3.5
    this.camera.position.x = 0
    this.camera.position.z = 8
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  buildPointsAnimation(index) {
    const unscale = this.modelsScale[index]

    // this.model.children[0].geometry.scale.set(0.1, 0.1, 0.1)
    // Get a list of random points (THREE.Vector3) inside our model
    // here we are using an utils that doing the math for us
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

  buildMeshPoint() {
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
      map: this.textures[0],
    })

    this.meshPoints = new THREE.Points(randomizedGeometry, material)
    this.meshPoints.position.y = -1.2
    this.meshPoints.rotation.y = THREE.MathUtils.degToRad(-90)

    this.scene.add(this.meshPoints)
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('go-prev', this.goPrev)
    window.addEventListener('go-next', this.goNext)
    this.handleRAF(0)
  }

  // EVENTS

  handleRAF = now => {
    // now: time in ms
    this.render(now)
    this.raf = window.requestAnimationFrame(this.handleRAF)
  }

  goPrev = () => {
    this.updateIndexAnimated()

    this.nextModelIndex = this.modelIndex === 0 ? this.models.length - 1 : this.modelIndex - 1
    this.explodeStart = performance.now()
    this.implodeStart = null
    this.isGoingNext = false
    this.isGoingPrev = true
  }

  goNext = () => {
    this.updateIndexAnimated()

    this.nextModelIndex = this.modelIndex === this.models.length - 1 ? 0 : this.modelIndex + 1
    this.explodeStart = performance.now()
    this.implodeStart = null
    this.isGoingNext = true
    this.isGoingPrev = false
  }

  // Prevent model index conflict if we click while there's still an animation
  updateIndexAnimated() {
    if (this.isGoingPrev) {
      this.modelIndex = this.modelIndex === 0 ? this.models.length - 1 : this.modelIndex - 1
    } else if (this.isGoingNext) {
      // directly update index to next animation
      this.modelIndex = this.modelIndex === this.models.length - 1 ? 0 : this.modelIndex + 1
    }
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

  handleGuiChange = () => {
    //set the color in the object
    this.meshPoints.material.color = new THREE.Color(this.guiController.color)
    this.meshPoints.material.size = this.guiController.size
    this.meshPoints.material.opacity = this.guiController.opacity
  }

  /**
   * Make particules explode in randomDirections
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

  // Render
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

    this.meshPoints.rotation.y -= ROTATION_SPEED

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
