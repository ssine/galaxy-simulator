const solar_sys_data = {
  earth: {
    mass: 5.965e24,
    radius: 6371000,
    orbit_radius: 149597870700,
    velocity: 29805.655
  },
  sun: {
    mass: 1.986e30
  }
}

const default_config = {
  density: solar_sys_data.earth.mass / (4 / 3 * Math.PI * Math.pow(solar_sys_data.earth.radius, 3)),
  position_scale: 2 / solar_sys_data.earth.orbit_radius,
  radius_scale: 0.01 / solar_sys_data.earth.radius
}

let trace_config = {
  trace_num: 200,
  trace_prelocate: 5
}
const bg_uri = 'assets/img/ESA_Gaia_DR2_AllSky_Brightness_Colour_Cartesian_2000x1000.png';

export {
  solar_sys_data,
  default_config,
  trace_config,
  bg_uri
}
