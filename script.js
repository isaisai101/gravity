const BACKGROUND = "black"

game.width = 800
game.height = 800
const ctx = game.getContext("2d")

let CAMERA_DIST = 4e11
let camAngleX = 0, camAngleY = 0, camAngleZ = 0
const G = 6.6743e-11

const sensitivity = 0.01

function rotate({x, y, z}) {
    let c, s, t

    // spin around Z (up axis): x and y move
    c = Math.cos(camAngleZ); s = Math.sin(camAngleZ)
    t = x*c - y*s;  y = x*s + y*c;  x = t

    // tilt around X: y and z move
    c = Math.cos(camAngleX); s = Math.sin(camAngleX)
    t = y*c - z*s;  z = y*s + z*c;  y = t

    return {x, y, z}
}

function toScreen(pos, r) {
    let {x, y, z} = rotate(pos)
    const d = CAMERA_DIST - z
    if (d < 1e10) return null
    return {
        x: (x/d + 1)/2 * game.width,
        y: (-y/d + 1)/2 * game.height,
        r: r/d/2 * game.width,
        depth: z
    }
}

function draw({ p, color }) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
}

function drawGrid() {
    const N = 10, S = 4e10  // 10 lines each way, 4e10 spacing
    ctx.strokeStyle = "rgba(255,255,255,0.15)"
    for (let i = -N; i <= N; i++) {
        line(new Vec3(i*S, -N*S, 0), new Vec3(i*S, N*S, 0))
        line(new Vec3(-N*S, i*S, 0), new Vec3(N*S, i*S, 0))
    }
}

function line(a, b) {
    const p = toScreen(a, 0), q = toScreen(b, 0)
    if (!p || !q) return
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
}

function clear() {
    ctx.fillStyle = BACKGROUND
    // ctx.fillStyle = "rgba(0,0,0,0.06)"
    ctx.fillRect(0, 0, game.width, game.height)
}

let dragging = false
let lastMouseX = 0, lastMouseY = 0

game.addEventListener("mousedown", e => {
    dragging = true
    lastMouseX = e.clientX
    lastMouseY = e.clientY
})

window.addEventListener("mouseup", () => dragging = false)

window.addEventListener("mousemove", e => {
    if (!dragging) return
    const dx = e.clientX - lastMouseX
    const dy = e.clientY - lastMouseY
    lastMouseX = e.clientX
    lastMouseY = e.clientY

    camAngleZ += dx * sensitivity
    camAngleX += dy * sensitivity
    camAngleX = Math.max(-Math.PI, Math.min(0, camAngleX))
})

game.addEventListener("wheel", e => {
    e.preventDefault()
    CAMERA_DIST *= e.deltaY > 0 ? 1.1 : 0.9
    CAMERA_DIST = Math.max(5e10, Math.min(5e12, CAMERA_DIST))
})

class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x
        this.y = y
        this.z = z
    }

    // return new
    plus(v)   { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z) }
    minus(v)  { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z) }
    times(s)  { return new Vec3(this.x * s, this.y * s, this.z * s) }
    neg()     { return new Vec3(-this.x, -this.y, -this.z) }

    // mutate this
    addTo(v)    { this.x += v.x; this.y += v.y; this.z += v.z; return this }
    subFrom(v)  { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this }
    scaleBy(s)  { this.x *= s;   this.y *= s; this.z *= s;   return this }

    length()   { return Math.hypot(this.x, this.y, this.z) }
    lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z }
}

class CelestialBody {
    mass = 1                        // in kg
    radius = 1                      // in meters
    velocity = new Vec3()           // in m/s
    position = new Vec3()           // in meters
    color = "white"

    constructor(mass, radius, position, velocity, color) {
        this.mass = mass
        this.radius = radius
        this.position = position
        this.velocity = velocity
        this.color = color
    }
}

function applyGravity(a, b, dt) {
    const rAB = b.position.minus(a.position)
    const F = G * a.mass * b.mass / rAB.lengthSq() * dt
    a.velocity.addTo(rAB.times(F/a.mass / rAB.length()));
}

function applyVelocity(a, dt) {
    a.position.addTo(a.velocity.times(dt))
}

const bodies = []
// central body: 20 px radius
bodies.push(new CelestialBody(1e32, 1e10, new Vec3(0, 0, 0), new Vec3(0, 0, 0), "yellow"))
// inner: 240 px out, 8 px radius
bodies.push(new CelestialBody(1e26, 4e9, new Vec3(1.2e11, 0, 0), new Vec3(0, 2.36e5, 0), "red"))
// outer: 340 px out, 6 px radius
bodies.push(new CelestialBody(1e26, 3e9, new Vec3(-1.7e11, 0, 0), new Vec3(0, -1.98e5, 0), "blue"))


let last = 0
function frame(now) {
    let dt = 3600*5
    last = now

    for (let i = 0; i < bodies.length; i++) {
        for (let j = 0; j < bodies.length; j++) {
            if (i == j)
                continue
            applyGravity(bodies[i], bodies[j], dt);
        }
    }

    for (let i = 0; i < bodies.length; i++) {
        applyVelocity(bodies[i], dt)
    }

    clear()

    const drawn = bodies
        .map(b => ({ p: toScreen(b.position, b.radius), color: b.color }))
        .filter(o => o.p !== null)
        .sort((a, b) => a.p.depth - b.p.depth)

    drawGrid()
    for (const o of drawn) draw(o)

    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)