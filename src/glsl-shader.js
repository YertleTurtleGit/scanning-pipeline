/* exported GLSL */

/** @type {{RED: number, GREEN: number, BLUE: number}} */
const LUMINANCE_CHANNEL_QUANTIFIER = {
   RED: 0.2126,
   GREEN: 0.7152,
   BLUE: 0.0722,
};

/**
 * @typedef {string} FLOAT_PRECISION
 * @enum {FLOAT_PRECISION}
 */
const GPU_GL_FLOAT_PRECISION = {
   MEDIUM: "medium" + "p",
   HIGH: "high" + "p",
};

/** @type {FLOAT_PRECISION} */
const FLOAT_PRECISION = GPU_GL_FLOAT_PRECISION.HIGH;

/**
 * @typedef {string} GLSL_VARIABLE
 */
const GLSL_VARIABLE = {
   UV: "uv",
   UV_U: "uv[0]",
   UV_V: "uv[1]",
   TEX: "tex",
   POS: "pos",
   OUT: "fragColor",
};

/**
 * @typedef {string} GLSL_VARIABLE_TYPE
 */
const GLSL_VARIABLE_TYPE = {
   FLOAT: "float",
   VECTOR2: "vec2",
   VECTOR3: "vec3",
   VECTOR4: "vec4",
   MATRIX3: "mat3",
   INTEGER: "int",
};

/**
 * @typedef {number} OPERATOR_TYPE
 */
const OPERATOR_TYPE = {
   SYMBOL: 0,
   METHOD: 1,
   CUSTOM: 2,
};

/**
 * @typedef {{GLSL_NAME: string, TYPE: OPERATOR_TYPE}} GLSL_OPERATOR
 */
const GLSL_OPERATOR = {
   ADD: { GLSL_NAME: " + ", TYPE: OPERATOR_TYPE.SYMBOL },
   SUBTRACT: { GLSL_NAME: " - ", TYPE: OPERATOR_TYPE.SYMBOL },
   MULTIPLY: { GLSL_NAME: " * ", TYPE: OPERATOR_TYPE.SYMBOL },
   DIVIDE: { GLSL_NAME: " / ", TYPE: OPERATOR_TYPE.SYMBOL },

   ABS: { GLSL_NAME: "abs", TYPE: OPERATOR_TYPE.METHOD },
   MAXIMUM: { GLSL_NAME: "max", TYPE: OPERATOR_TYPE.METHOD },
   MINIMUM: { GLSL_NAME: "min", TYPE: OPERATOR_TYPE.METHOD },
   DOT: { GLSL_NAME: "dot", TYPE: OPERATOR_TYPE.METHOD },
   INVERSE: { GLSL_NAME: "inverse", TYPE: OPERATOR_TYPE.METHOD },
   NORMALIZE: { GLSL_NAME: "normalize", TYPE: OPERATOR_TYPE.METHOD },
   LENGTH: { GLSL_NAME: "length", TYPE: OPERATOR_TYPE.METHOD },
   SINE: { GLSL_NAME: "sin", TYPE: OPERATOR_TYPE.METHOD },
   COSINE: { GLSL_NAME: "cos", TYPE: OPERATOR_TYPE.METHOD },
   ARC_COSINE: { GLSL_NAME: "acos", TYPE: OPERATOR_TYPE.METHOD },
   RADIANS: { GLSL_NAME: "radians", TYPE: OPERATOR_TYPE.METHOD },
   SIGN: { GLSL_NAME: "sign", TYPE: OPERATOR_TYPE.METHOD },
   STEP: { GLSL_NAME: "step", TYPE: OPERATOR_TYPE.METHOD },
   DISTANCE: { GLSL_NAME: "distance", TYPE: OPERATOR_TYPE.METHOD },

   LUMINANCE: { GLSL_NAME: "luminance", TYPE: OPERATOR_TYPE.CUSTOM },
   CHANNEL: { GLSL_NAME: "channel", TYPE: OPERATOR_TYPE.CUSTOM },
   VEC3_TO_VEC4: { GLSL_NAME: "vec3_to_vec4", TYPE: OPERATOR_TYPE.CUSTOM },
};

class Shader {
   /**
    * @param  {{ width: number, height: number }} dimensions
    */
   constructor(dimensions) {
      /**
       * @private
       * @type {GlslShader}
       */
      this.glslShader = null;
      this.dimensions = dimensions;
   }

   bind() {
      if (this.glslShader !== null) {
         console.warn("Shader is already bound!");
      }
      this.glslShader = new GlslShader(this.dimensions);
      GlslShader.boundShader = this.glslShader;
   }

   unbind() {
      GlslShader.boundShader = null;
      this.glslShader = null;
   }

   purge() {
      if (this.glslShader === null) {
         console.warn("No shader bound to purge!");
      } else {
         this.glslShader.reset();
         this.unbind();
      }
   }
   /**
    * @returns {GlslVector2}
    */
   getUV() {
      return new GlslVector2(undefined, GLSL_VARIABLE.UV);
   }
}

class GlslShader {
   /**
    * @public
    * @param  {{ width: number, height: number }} dimensions
    */
   constructor(dimensions) {
      /**
       * @private
       * @type {GPU_GL_FLOAT_PRECISION}
       */
      this.floatPrecision = FLOAT_PRECISION;
      /**
       * @private
       * @type {GlslUniform[]}
       */
      this.glslUniforms = [];
      /**
       * @private
       * @type {string[]}
       */
      this.glslCommands = [];
      this.glslContext = new GlslContext(dimensions, this);
   }
   /**
    * @public
    * @static
    * @returns {GlslShader}
    */
   static getBoundShader() {
      return GlslShader.boundShader;
   }
   /**
    * @public
    */
   reset() {
      this.glslContext.reset();
      GlslShader.boundShader = null;
   }
   /**
    * @public
    * @static
    * @param  {string} glslCommand
    * @returns {void}
    */
   static addGlslCommandToBoundShader(glslCommand) {
      GlslShader.getBoundShader().addGlslCommand(glslCommand);
   }
   /**
    * @static
    * @param  {GlslUniform} glslUniform
    * @returns {void}
    */
   static addGlslUniformToBoundShader(glslUniform) {
      GlslShader.getBoundShader().addGlslUniform(glslUniform);
   }
   /**
    * @static
    * @returns {GlslContext}
    */
   static getGlslContext() {
      return GlslShader.getBoundShader().glslContext;
   }
   /**
    * @returns {GlslUniform[]}
    */
   getGlslUniforms() {
      return this.glslUniforms;
   }
   /**
    * @returns {string}
    */
   getVertexShaderSource() {
      return [
         "#version 300 es",
         "",
         "in vec3 " + GLSL_VARIABLE.POS + ";",
         "in vec2 " + GLSL_VARIABLE.TEX + ";",
         "",
         "out vec2 " + GLSL_VARIABLE.UV + ";",
         "",
         "void main() {",
         GLSL_VARIABLE.UV + " = " + GLSL_VARIABLE.TEX + ";",
         "gl_Position = vec4(" + GLSL_VARIABLE.POS + ", 1.0);",
         "}",
      ].join("\n");
   }
   /**
    * @param  {GlslVector4} outVariable
    * @returns {string}
    */
   getFragmentShaderSource(outVariable) {
      const uniformDeclarations = [];
      for (let i = 0; i < this.glslUniforms.length; i++) {
         uniformDeclarations.push(this.glslUniforms[i].getGlslDeclaration());
      }
      return [
         "#version 300 es",
         "precision " + this.floatPrecision + " float;",
         "",
         "in vec2 " + GLSL_VARIABLE.UV + ";",
         "out vec4 " + GLSL_VARIABLE.OUT + ";",
         "",
         ...uniformDeclarations,
         "",
         "float luminance(vec4 image) {",
         "return image.r * " +
            GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER.RED) +
            " + image.g * " +
            GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER.GREEN) +
            " + image.b * " +
            GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER.BLUE) +
            ";",
         "}",
         "",
         "void main() {",
         ...this.glslCommands,
         GLSL_VARIABLE.OUT + " = " + outVariable.getGlslName() + ";",
         "}",
      ].join("\n");
   }
   /**
    * @private
    * @param  {string} glslCommand
    * @returns {void}
    */
   addGlslCommand(glslCommand) {
      this.glslCommands.push(glslCommand);
   }
   /**
    * @private
    * @param  {GlslUniform} glslUniform
    * @returns {void}
    */
   addGlslUniform(glslUniform) {
      this.glslUniforms.push(glslUniform);
   }
}
/**
 * @static
 * @type {GlslShader}
 */
GlslShader.boundShader;

class GlslContext {
   /**
    * @public
    * @param  {{ width: number, height: number }} dimensions
    * @param {GlslShader} glslShader
    */
   constructor(dimensions, glslShader) {
      this.glslShader = glslShader;
      this.glCanvas = document.createElement("canvas");
      this.glCanvas.width = dimensions.width;
      this.glCanvas.height = dimensions.height;
      this.glContext = this.glCanvas.getContext("webgl2");
   }

   reset() {
      this.glContext.flush();
      this.glContext.finish();
      this.glCanvas.remove();
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }
   /**
    * @returns {WebGL2RenderingContext}
    */
   getGlContext() {
      return this.glContext;
   }
   /**
    * @param  {GlslVector4} outVariable
    * @returns {Uint8Array}
    */
   renderPixelArray(outVariable) {
      return this.renderToPixelArray(outVariable);
   }
   /**
    * @returns {string}
    */
   renderDataUrl() {
      return this.glCanvas.toDataURL();
   }
   /**
    * @private
    * @param  {GlslVector4} outVariable
    * @returns {WebGLProgram}
    */
   createShaderProgram(outVariable) {
      let vertexShader = this.glContext.createShader(
         this.glContext.VERTEX_SHADER
      );
      let fragmentShader = this.glContext.createShader(
         this.glContext.FRAGMENT_SHADER
      );
      const vertexShaderSource = this.glslShader.getVertexShaderSource();
      const fragmentShaderSource =
         this.glslShader.getFragmentShaderSource(outVariable);
      //console.log(vertexShaderSource);
      //console.log(fragmentShaderSource);
      this.glContext.shaderSource(vertexShader, vertexShaderSource);
      this.glContext.shaderSource(fragmentShader, fragmentShaderSource);
      //console.log("Compiling shader program.");
      this.glContext.compileShader(vertexShader);
      this.glContext.compileShader(fragmentShader);
      let shaderProgram = this.glContext.createProgram();
      this.glContext.attachShader(shaderProgram, vertexShader);
      this.glContext.attachShader(shaderProgram, fragmentShader);
      this.glContext.linkProgram(shaderProgram);
      return shaderProgram;
   }
   /**
    * @private
    * @param  {WebGLProgram} shaderProgram
    * @returns {void}
    */
   loadGlslUniforms(shaderProgram) {
      const glslUniforms = this.glslShader.getGlslUniforms();

      let textureUnit = 0;

      glslUniforms.forEach((uniform) => {
         if (uniform instanceof GlslUniformImage) {
            uniform.loadIntoShaderProgram(
               this.glContext,
               shaderProgram,
               textureUnit
            );
            textureUnit++;
         } else {
            uniform.loadIntoShaderProgram(this.glContext, shaderProgram);
         }
      });
   }
   /**
    * @param  {WebGLProgram} shaderProgram
    * @returns {WebGLVertexArrayObject}
    */
   getFrameVAO(shaderProgram) {
      const framePositionLocation = this.glContext.getAttribLocation(
         shaderProgram,
         GLSL_VARIABLE.POS
      );
      const frameTextureLocation = this.glContext.getAttribLocation(
         shaderProgram,
         GLSL_VARIABLE.TEX
      );
      const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
      const frameVertices = [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1];
      const frameTextCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];
      let vaoFrame = this.glContext.createVertexArray();
      this.glContext.bindVertexArray(vaoFrame);
      let vboFrameV = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameV);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameVertices),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         framePositionLocation,
         2,
         this.glContext.FLOAT,
         false,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(framePositionLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
      let vboFrameT = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameT);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameTextCoords),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         frameTextureLocation,
         2,
         this.glContext.FLOAT,
         false,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(frameTextureLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
      this.glContext.bindVertexArray(null);
      return vaoFrame;
   }

   /**
    * @param  {WebGLVertexArrayObject} vaoFrame
    * @returns {void}
    */
   drawArraysFromVAO(vaoFrame) {
      this.glContext.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      this.glContext.clearColor(0, 0, 0, 0);
      this.glContext.clear(
         this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
      );
      this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE);
      this.glContext.enable(this.glContext.BLEND);
      this.glContext.disable(this.glContext.DEPTH_TEST);
      this.glContext.bindVertexArray(vaoFrame);
      this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
      this.glContext.bindVertexArray(null);
   }
   /**
    * @private
    * @returns {Uint8Array}
    */
   readToPixelArray() {
      let pixelArray = new Uint8Array(
         this.glCanvas.width * this.glCanvas.height * 4
      );
      this.glContext.readPixels(
         0,
         0,
         this.glCanvas.width,
         this.glCanvas.height,
         this.glContext.RGBA,
         this.glContext.UNSIGNED_BYTE,
         pixelArray
      );
      return pixelArray;
   }
   /**
    * @param  {GlslVector4} outVariable
    * @returns {Uint8Array}
    */
   renderToPixelArray(outVariable) {
      this.drawCall(outVariable);
      const pixelArray = this.readToPixelArray();
      return pixelArray;
   }
   /**
    * @param  {GlslVector4} outVariable
    * @returns {void}
    */
   drawCall(outVariable) {
      const shaderProgram = this.createShaderProgram(outVariable);
      this.glContext.useProgram(shaderProgram);
      this.loadGlslUniforms(shaderProgram);
      //console.log("Rendering on gpu.");
      const vaoFrame = this.getFrameVAO(shaderProgram);
      this.drawArraysFromVAO(vaoFrame);
   }
}

class GlslRendering {
   /**
    * @param  {GlslContext} glslContext
    * @param  {GlslVector4} outVariable
    */
   constructor(glslContext, outVariable) {
      this.glslContext = glslContext;
      this.outVariable = outVariable;
   }
   /**
    * @static
    * @param  {GlslVector4} outVariable
    * @returns {GlslRendering}
    */
   static render(outVariable) {
      return new GlslRendering(GlslShader.getGlslContext(), outVariable);
   }
   /**
    * @returns {Uint8Array}
    */
   getPixelArray() {
      if (!this.pixelArray) {
         this.pixelArray = this.glslContext.renderPixelArray(this.outVariable);
      }
      return this.pixelArray;
   }
   /**
    * @returns {string}
    */
   getDataUrl() {
      if (!this.dataUrl) {
         this.getPixelArray();
         this.dataUrl = this.glslContext.renderDataUrl();
      }
      return this.dataUrl;
   }
   /**
    * @returns {Promise<HTMLImageElement>}
    */
   async getJsImage() {
      if (!this.jsImage) {
         const thisDataUrl = this.getDataUrl();
         this.jsImage = await new Promise((resolve) => {
            const image = new Image();
            image.addEventListener("load", () => {
               resolve(image);
            });
            image.src = thisDataUrl;
         });
      }
      return this.jsImage;
   }
}

class GlslOperation {
   /**
    * @param  {GlslVariable} callingParameter
    * @param  {GlslVariable} result
    * @param  {GlslVariable[]} parameters
    * @param  {GLSL_OPERATOR} glslOperator
    */
   constructor(callingParameter, result, parameters, glslOperator) {
      this.callingParameter = callingParameter;
      this.result = result;
      this.parameters = parameters;
      this.glslOperator = glslOperator;
   }
   /**
    * @private
    * @static
    * @param  {string} methodName
    * @param  {string[]} params
    * @returns {string}
    */
   static getGlslExpressionOfParams(methodName, params) {
      if (params.length === 1) {
         return params[0];
      } else if (params.length === 2) {
         return methodName + "(" + params[0] + ", " + params[1] + ")";
      } else {
         return (
            methodName +
            "(" +
            params.pop() +
            ", " +
            GlslOperation.getGlslExpressionOfParams(methodName, params) +
            ")"
         );
      }
   }
   /**
    * @returns {string}
    */
   getDeclaration() {
      const glslNames = GlslVariable.getGlslNamesOfGlslVariables(
         this.parameters
      );
      if (this.glslOperator.TYPE === OPERATOR_TYPE.SYMBOL) {
         glslNames.unshift(this.callingParameter.getGlslName());
         return (
            this.result.getGlslName() +
            " = " +
            glslNames.join(this.glslOperator.GLSL_NAME) +
            ";"
         );
      } else if (this.glslOperator.TYPE === OPERATOR_TYPE.METHOD) {
         if (
            this.glslOperator === GLSL_OPERATOR.MAXIMUM ||
            this.glslOperator === GLSL_OPERATOR.MINIMUM
         ) {
            glslNames.unshift(this.callingParameter.getGlslName());
            return (
               this.result.getGlslName() +
               " = " +
               GlslOperation.getGlslExpressionOfParams(
                  this.glslOperator.GLSL_NAME,
                  glslNames
               ) +
               ";"
            );
         }
         return (
            this.result.getGlslName() +
            " = " +
            this.glslOperator.GLSL_NAME +
            "(" +
            glslNames.join(", ") +
            ");"
         );
      } else if (this.glslOperator.TYPE === OPERATOR_TYPE.CUSTOM) {
         if (this.glslOperator === GLSL_OPERATOR.CHANNEL) {
            return (
               this.result.getGlslName() +
               " = " +
               glslNames[0] +
               "[" +
               glslNames[1] +
               "];"
            );
         } else if (this.glslOperator === GLSL_OPERATOR.VEC3_TO_VEC4) {
            return (
               this.result.getGlslName() +
               " = vec4(" +
               glslNames[0] +
               ", " +
               glslNames[1] +
               ");"
            );
         } else if (this.glslOperator === GLSL_OPERATOR.LUMINANCE) {
            return (
               this.result.getGlslName() +
               " = " +
               this.glslOperator.GLSL_NAME +
               "(" +
               glslNames[0] +
               ");"
            );
         }
      }
   }
}

class GlslUniform {
   /**
    * @abstract
    * @protected
    * @param {any} initialValue
    */
   constructor(initialValue) {
      GlslShader.addGlslUniformToBoundShader(this);
      this.value = initialValue;
      this.glslName = GlslVariable.getUniqueName("uniform");
   }

   /**
    * @abstract
    * @public
    * @returns {string}
    */
   getGlslDeclaration() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @public
    * @returns {string}
    */
   getGlslName() {
      return this.glslName;
   }

   /**
    * @public
    * @abstract
    * @name setValue
    * @param {undefined} value
    */

   /**
    * @public
    * @abstract
    * @name getValue
    * @returns {void}
    */

   // TODO Hide concrete methods from outside.
   /**
    * Is called automatically.
    *
    * @public
    * @abstract
    * @name loadIntoShaderProgram
    * @param {WebGL2RenderingContext} context
    * @param {WebGLProgram} shaderProgram
    * @param {number} textureUnit
    */
   loadIntoShaderProgram(context, shaderProgram, textureUnit = undefined) {
      console.error(
         "Not possible to call abstract method.",
         context,
         shaderProgram,
         textureUnit
      );
   }
}

class GlslUniformFloat extends GlslUniform {
   /**
    * @param {number} initialValue
    */
   constructor(initialValue = undefined) {
      super(initialValue);
   }

   /**
    * @public
    * @returns {string}
    */
   getGlslDeclaration() {
      return "uniform float " + this.getGlslName() + ";";
   }

   /**
    * @public
    * @param {number} value
    */
   setValue(value) {
      this.value = value;
   }

   /**
    * @public
    * @returns {GlslFloat}
    */
   getValue() {
      return new GlslFloat(null, this.getGlslName());
   }

   /**
    * @public
    * @param {WebGL2RenderingContext} context
    * @param {WebGLProgram} shaderProgram
    */
   loadIntoShaderProgram(context, shaderProgram) {
      context.uniform1f(
         context.getUniformLocation(shaderProgram, this.getGlslName()),
         this.value
      );
   }
}

class GlslUniformImage extends GlslUniform {
   /**
    * @public
    * @param {HTMLImageElement} initialValue
    */
   constructor(initialValue = undefined) {
      super(initialValue);
   }

   /**
    * @public
    * @returns {string}
    */
   getGlslDeclaration() {
      return "uniform sampler2D " + this.getGlslName() + ";";
   }

   /**
    * @public
    * @param {HTMLImageElement} value
    */
   setValue(value) {
      this.value = value;
   }

   /**
    * @public
    * @returns {GlslImage}
    */
   getValue() {
      return GlslImage.getFromGlslUniform(this);
   }

   /**
    * @override
    * @public
    * @param {WebGL2RenderingContext} context
    * @param {WebGLProgram} shaderProgram
    * @param {number} textureUnit
    */
   loadIntoShaderProgram(context, shaderProgram, textureUnit) {
      if (!this.value) {
         return;
      }

      const texture = context.createTexture();

      context.bindTexture(context.TEXTURE_2D, texture);
      context.texParameteri(
         context.TEXTURE_2D,
         context.TEXTURE_WRAP_S,
         context.CLAMP_TO_EDGE
      );
      context.texParameteri(
         context.TEXTURE_2D,
         context.TEXTURE_WRAP_T,
         context.CLAMP_TO_EDGE
      );
      context.texParameteri(
         context.TEXTURE_2D,
         context.TEXTURE_MIN_FILTER,
         context.LINEAR
      );
      context.texParameteri(
         context.TEXTURE_2D,
         context.TEXTURE_MAG_FILTER,
         context.LINEAR
      );
      context.texImage2D(
         context.TEXTURE_2D,
         0,
         context.RGBA,
         context.RGBA,
         context.UNSIGNED_BYTE,
         this.value
      );

      context.activeTexture(context.TEXTURE0 + textureUnit);
      context.bindTexture(context.TEXTURE_2D, texture);
      context.uniform1i(
         context.getUniformLocation(shaderProgram, this.getGlslName()),
         textureUnit
      );
   }
}

class GlslImage {
   /**
    * @public
    * @param {GlslUniformImage} glslUniformImage
    * @returns {GlslImage}
    */
   static getFromGlslUniform(glslUniformImage) {
      const glslImage = new GlslImage(null);
      glslImage.jsImage = glslUniformImage.value;
      glslImage.uniform = glslUniformImage;
      glslImage.glslVector4 = new GlslVector4(
         null,
         "texture(" +
            glslUniformImage.getGlslName() +
            ", " +
            GLSL_VARIABLE.UV +
            ")"
      );
      return glslImage;
   }

   /**
    * @public
    * @param  {HTMLImageElement} jsImage
    */
   constructor(jsImage) {
      this.jsImage = jsImage;
      this.uniform = new GlslUniformImage(jsImage);
      this.glslVector4 = new GlslVector4(
         null,
         "texture(" + this.uniform.getGlslName() + ", " + GLSL_VARIABLE.UV + ")"
      );
   }
   /**
    * @public
    * @returns {GlslVector4}
    */
   getPixelColor() {
      return this.glslVector4;
   }

   /**
    * @param {number[][]} kernel Convolution matrix (NxN).
    * @param {boolean} normalize
    * @returns {GlslVector4}
    */
   applyFilter(kernel, normalize = false) {
      // TODO Check if kernel is quadratic.

      let filtered = new GlslVector4([
         new GlslFloat(0),
         new GlslFloat(0),
         new GlslFloat(0),
         new GlslFloat(1),
      ]);

      if (normalize) {
         let kernelSum = 0;

         kernel.forEach((row) => {
            row.forEach((value) => {
               kernelSum += value;
            });
         });

         if (kernelSum !== 0) {
            kernel.forEach((row, rowIndex) => {
               row.forEach((value, columnIndex) => {
                  kernel[rowIndex][columnIndex] = value / kernelSum;
               });
            });
         }
      }

      const kernelCenter = (kernel.length - 1) / 2;

      kernel.forEach((row, rowIndex) => {
         row.forEach((value, columnIndex) => {
            if (value !== 0) {
               filtered = filtered.addVector4(
                  new GlslFloat(value).multiplyVector4(
                     this.getNeighborPixel(
                        columnIndex - kernelCenter,
                        rowIndex - kernelCenter
                     )
                  )
               );
            }
         });
      });

      return new GlslVector4([
         filtered.channel(0),
         filtered.channel(1),
         filtered.channel(2),
         new GlslFloat(1),
      ]);
   }

   /**
    * @public
    * @param {number} offsetX
    * @param {number} offsetY
    * @returns {GlslVector4}
    */
   getNeighborPixel(offsetX, offsetY) {
      const u = (1 / this.jsImage.width) * offsetX;
      const v = (1 / this.jsImage.height) * offsetY;

      const glslOffset = {
         u: GlslFloat.getJsNumberAsString(u),
         v: GlslFloat.getJsNumberAsString(v),
      };

      return new GlslVector4(
         null,
         "texture(" +
            this.uniform.getGlslName() +
            ", vec2(" +
            GLSL_VARIABLE.UV_U +
            " + " +
            glslOffset.u +
            ", " +
            GLSL_VARIABLE.UV_V +
            " + " +
            glslOffset.v +
            "))"
      );
   }
}

/**
 * @abstract
 */
class GlslVariable {
   /**
    * @abstract
    * @param {string} [customDeclaration=""]
    */
   constructor(customDeclaration = "") {
      this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
      if (customDeclaration !== null) {
         if (customDeclaration !== "") {
            customDeclaration = " = " + customDeclaration;
         }
         GlslShader.addGlslCommandToBoundShader(
            this.getGlslVarType() +
               " " +
               this.getGlslName() +
               customDeclaration +
               ";"
         );
      }
   }

   /**
    * @param  {string} prefix
    * @returns {string}
    */
   static getUniqueName(prefix) {
      GlslVariable.uniqueNumber++;
      return prefix + "_" + GlslVariable.uniqueNumber.toString();
   }

   /**
    * @param  {GlslVariable[]} glslVariables
    * @returns {string[]}
    */
   static getGlslNamesOfGlslVariables(glslVariables) {
      let glslNames = [];
      if (glslVariables !== null) {
         for (let i = 0; i < glslVariables.length; i++) {
            glslNames.push(glslVariables[i].getGlslName());
         }
      }
      return glslNames;
   }

   /**
    * @public
    * @returns {string}
    */
   getGlslName() {
      return this.glslName;
   }

   /**
    * @private
    * @param  {GlslOperation} glslOperation
    * @returns {void}
    */
   declareGlslResult(glslOperation) {
      GlslShader.addGlslCommandToBoundShader(glslOperation.getDeclaration());
   }

   /**
    * @protected
    * @param  {GlslVariable[]} operants
    * @param  {GLSL_OPERATOR} operator
    * @returns {GlslFloat}
    */
   getGlslFloatResult(operants, operator) {
      const glslResult = new GlslFloat();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   /**
    * @protected
    * @param  {GlslVariable[]} operants
    * @param  {GLSL_OPERATOR} operator
    * @returns {GlslVector3}
    */
   getGlslVector3Result(operants, operator) {
      const glslResult = new GlslVector3();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   /**
    * @protected
    * @param  {GlslVariable[]} operants
    * @param  {GLSL_OPERATOR} operator
    * @returns {GlslVector4}
    */
   getGlslVector4Result(operants, operator) {
      const glslResult = new GlslVector4();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   /**
    * @protected
    * @param  {GlslVariable[]} operants
    * @param  {GLSL_OPERATOR} operator
    * @returns {GlslMatrix3}
    */
   getGlslMatrix3Result(operants, operator) {
      const glslResult = new GlslMatrix3();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   /**
    * @abstract
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   addFloat() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   addVector3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   addVector4() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   addMatrix3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   subtractFloat() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   subtractVector3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   subtractVector4() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   subtractMatrix3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   multiplyFloat() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   multiplyVector3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   multiplyVector4() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   multiplyMatrix3() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   divideFloat() {
      throw new Error("Abstract method not callable.");
   }

   /**
    * @abstract
    */
   abs() {
      throw new Error("Abstract method not callable.");
   }
}

GlslVariable.uniqueNumber = 0;

/** @abstract */
class GlslVector extends GlslVariable {
   /**
    * @param {number} channel
    * @returns {GlslFloat}
    */
   channel(channel) {
      return this.getGlslFloatResult(
         [this, new GlslInteger(channel)],
         GLSL_OPERATOR.CHANNEL
      );
   }

   /**
    * @abstract
    * @name abs
    * @returns {GlslVector}
    */
   /**
    * @abstract
    * @name normalize
    * @returns {GlslVector}
    */
}

/** @abstract */
class GlslMatrix extends GlslVariable {
   /**
    * @abstract
    * @name inverse
    * @returns {GlslMatrix}
    */
}

class GlslInteger extends GlslVariable {
   /**
    * @param  {number} jsNumber
    */
   constructor(jsNumber = null) {
      if (jsNumber !== null) {
         super(null);
         this.glslName = Math.floor(jsNumber).toString();
      } else {
         super();
      }
   }
   /**
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.INTEGER;
   }
}

class GlslFloat extends GlslVariable {
   /**
    * @static
    * @param  {number} number
    * @returns {string}
    */
   static getJsNumberAsString(number) {
      if (Math.trunc(number) === number) {
         return "(" + number.toString() + ".0)";
      }
      if (number.toString().includes("e-")) {
         //console.warn(number.toString() + " is converted to zero.");
         return "0.0";
      }
      return "(" + number.toString() + ")";
   }

   /**
    * @param  {number} jsNumber
    * @param {string} customDeclaration
    */
   constructor(jsNumber = null, customDeclaration = undefined) {
      if (customDeclaration) {
         super(customDeclaration);
      } else {
         if (jsNumber !== null) {
            super(null);
            this.glslName = GlslFloat.getJsNumberAsString(jsNumber);
         } else {
            super();
         }
      }
   }

   /**
    * @override
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.FLOAT;
   }

   /**
    * @override
    * @param  {...GlslFloat} addends
    * @returns {GlslFloat}
    */
   addFloat(...addends) {
      return this.getGlslFloatResult(addends, GLSL_OPERATOR.ADD);
   }

   /**
    * @override
    * @param  {...GlslVector3} addends
    * @returns {GlslVector3}
    */
   addVector3(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }

   /**
    * @override
    * @param  {...GlslVector4} addends
    * @returns {GlslVector4}
    */
   addVector4(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }

   /**
    * @override
    * @param  {...GlslMatrix3} addends
    * @returns {GlslMatrix3}
    */
   addMatrix3(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }

   /**
    * @override
    * @param  {...GlslFloat} subtrahends
    * @returns {GlslFloat}
    */
   subtractFloat(...subtrahends) {
      return this.getGlslFloatResult(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }

   /**
    * @override
    * @param  {...GlslVector3} subtrahends
    * @returns {GlslVector3}
    */
   subtractVector3(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }

   /**
    * @override
    * @param  {...GlslVector4} subtrahends
    * @returns {GlslVector4}
    */
   subtractVector4(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @override
    * @param  {...GlslMatrix3} subtrahends
    * @returns {GlslMatrix3}
    */
   subtractMatrix3(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @override
    * @param  {...GlslFloat} factors
    * @returns {GlslFloat}
    */
   multiplyFloat(...factors) {
      return this.getGlslFloatResult(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @override
    * @param  {...GlslVector3} factors
    * @returns {GlslVector3}
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @override
    * @param  {...GlslVector4} factors
    * @returns {GlslVector4}
    */
   multiplyVector4(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @override
    * @param  {...GlslMatrix3} factors
    * @returns {GlslMatrix3}
    */
   multiplyMatrix3(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @override
    * @param  {...GlslFloat} divisors
    * @returns {GlslFloat}
    */
   divideFloat(...divisors) {
      return this.getGlslFloatResult(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @override
    * @returns {GlslFloat}
    */
   abs() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslFloat}
    */
   maximum(...parameters) {
      return this.getGlslFloatResult(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslFloat}
    */
   minimum(...parameters) {
      return this.getGlslFloatResult(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @returns {GlslFloat}
    */
   radians() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.RADIANS);
   }
   /**
    * @returns {GlslFloat}
    */
   sin() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.SINE);
   }
   /**
    * @returns {GlslFloat}
    */
   cos() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.COSINE);
   }
   /**
    * @returns {GlslFloat}
    */
   acos() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.ARC_COSINE);
   }
   /**
    * @returns {GlslFloat} Is one when the input is positive,
    * zero when the input is zero and minus one when the
    * input is negative.
    */
   sign() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.SIGN);
   }
   /**
    * @param {GlslFloat} edge
    * @returns {GlslFloat} Is zero if input is smaller than edge and otherwise one.
    */
   step(edge = new GLSL.Float(0.5)) {
      return this.getGlslFloatResult([edge, this], GLSL_OPERATOR.STEP);
   }
}

class GlslVector2 extends GlslVector {
   /**
    * @param  {GlslFloat[]} vector2
    * @param {string} customDeclaration
    */
   constructor(vector2 = undefined, customDeclaration = undefined) {
      if (!customDeclaration) {
         customDeclaration = "";
         if (vector2) {
            let vector2GlslNames = [];

            vector2GlslNames.push(vector2[0].getGlslName());
            vector2GlslNames.push(vector2[1].getGlslName());

            customDeclaration =
               GLSL_VARIABLE_TYPE.VECTOR2 +
               "(" +
               vector2GlslNames.join(", ") +
               ")";
         }
      }
      super(customDeclaration);
   }
   /**
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.VECTOR2;
   }

   /**
    * @param {GlslVector2} point
    * @returns {GlslFloat}
    */
   distance(point) {
      return this.getGlslFloatResult([this, point], GLSL_OPERATOR.DISTANCE);
   }
}

class GlslVector3 extends GlslVector {
   /**
    * @param  {GlslFloat[]} vector3
    */
   constructor(vector3 = undefined) {
      let customDeclaration = "";
      if (vector3) {
         let vector3GlslNames = [];

         vector3GlslNames.push(vector3[0].getGlslName());
         vector3GlslNames.push(vector3[1].getGlslName());
         vector3GlslNames.push(vector3[2].getGlslName());

         customDeclaration =
            GLSL_VARIABLE_TYPE.VECTOR3 +
            "(" +
            vector3GlslNames.join(", ") +
            ")";
      }
      super(customDeclaration);
   }
   /**
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.VECTOR3;
   }
   /**
    * @override
    * @param  {...GlslFloat} addends
    * @returns {GlslVector3}
    */
   addFloat(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslVector3} addends
    * @returns {GlslVector3}
    */
   addVector3(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec4 to vec3.
    */
   addVector4() {
      throw new Error("Not possible to add vec4 to vec3.");
   }
   /**
    * @throws {Error} Not possible to add mat3 to vec3.
    */
   addMatrix3() {
      throw new Error("Not possible to add mat3 to vec3.");
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @returns {GlslVector3}
    */
   subtractFloat(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslVector3} subtrahends
    * @returns {GlslVector3}
    */
   subtractVector3(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract vec4 from vec3.
    */
   subtractVector4() {
      throw new Error("Not possible to subtract vec4 from vec3.");
   }
   /**
    * @throws {Error} Not possible to subtract mat3 from vec3.
    */
   subtractMatrix3() {
      throw new Error("Not possible to subtract mat3 from vec3.");
   }
   /**
    * @param  {...GlslFloat} factors
    * @returns {GlslVector3}
    */
   multiplyFloat(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector3} factors
    * @returns {GlslVector3}
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec4 with vec3.
    */
   multiplyVector4() {
      throw new Error("Not possible to multiply vec4 with vec3.");
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @returns {GlslVector3}
    */
   multiplyMatrix3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslFloat} divisors
    * @returns {GlslVector3}
    */
   divideFloat(...divisors) {
      return this.getGlslVector3Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @returns {GlslFloat}
    */
   length() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LENGTH);
   }
   /**
    * @returns {GlslVector3}
    */
   abs() {
      return this.getGlslVector3Result([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @returns {GlslVector3}
    */
   normalize() {
      return this.getGlslVector3Result([this], GLSL_OPERATOR.NORMALIZE);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslVector3}
    */
   maximum(...parameters) {
      return this.getGlslVector3Result(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslVector3}
    */
   minimum(...parameters) {
      return this.getGlslVector3Result(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @param  {GlslVector} parameter
    * @returns {GlslFloat}
    */
   dot(parameter) {
      return this.getGlslFloatResult([this, parameter], GLSL_OPERATOR.DOT);
   }
   /**
    * @param  {GlslFloat} fourthChannel
    * @returns {GlslVector4}
    */
   getVector4(fourthChannel = new GlslFloat(1)) {
      return this.getGlslVector4Result(
         [this, fourthChannel],
         GLSL_OPERATOR.VEC3_TO_VEC4
      );
   }
}

class GlslVector4 extends GlslVector {
   /**
    * @param  {GlslFloat[]} vector4
    * @param  {string} customDeclaration
    */
   constructor(vector4 = undefined, customDeclaration = "") {
      if (customDeclaration === "") {
         if (vector4) {
            let vector4GlslNames = [];

            vector4GlslNames.push(vector4[0].getGlslName());
            vector4GlslNames.push(vector4[1].getGlslName());
            vector4GlslNames.push(vector4[2].getGlslName());
            vector4GlslNames.push(vector4[3].getGlslName());

            customDeclaration =
               GLSL_VARIABLE_TYPE.VECTOR4 +
               "(" +
               vector4GlslNames.join(", ") +
               ")";
         }
      }
      super(customDeclaration);
   }
   /**
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.VECTOR4;
   }
   /**
    * @param  {...GlslFloat} addends
    * @returns {GlslVector4}
    */
   addFloat(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec3 to vec4.
    */
   addVector3() {
      throw new Error("Not possible to add vec3 to vec4.");
   }
   /**
    * @param  {...GlslVector4} addends
    * @returns {GlslVector4}
    */
   addVector4(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add mat3 to vec4.
    */
   addMatrix3() {
      throw new Error("Not possible to add mat3 to vec4.");
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @returns {GlslVector4}
    */
   subtractFloat(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract vec3 from vec4.
    */
   subtractVector3() {
      throw new Error("Not possible to subtract vec3 from vec4.");
   }
   /**
    * @param  {...GlslVector4} subtrahends
    * @returns {GlslVector4}
    */
   subtractVector4(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract mat3 from vec4.
    */
   subtractMatrix3() {
      throw new Error("Not possible to subtract mat3 from vec4.");
   }
   /**
    * @param  {...GlslFloat} factors
    * @returns {GlslVector4}
    */
   multiplyFloat(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec3 with vec4.
    */
   multiplyVector3() {
      throw new Error("Not possible to multiply vec3 with vec4.");
   }
   /**
    * @param  {...GlslVector4} factors
    * @returns {GlslVector4}
    */
   multiplyVector4(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply mat3 with vec4.
    */
   multiplyMatrix3() {
      throw new Error("Not possible to multiply mat3 with vec4.");
   }
   /**
    * @param  {...GlslFloat} divisors
    * @returns {GlslVector4}
    */
   divideFloat(...divisors) {
      return this.getGlslVector4Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @returns {GlslVector4}
    */
   abs() {
      return this.getGlslVector4Result([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @returns {GlslFloat}
    */
   length() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LENGTH);
   }
   /**
    * @returns {GlslVector4}
    */
   normalize() {
      return this.getGlslVector4Result([this], GLSL_OPERATOR.NORMALIZE);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslVector4}
    */
   maximum(...parameters) {
      return this.getGlslVector4Result(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @returns {GlslVector4}
    */
   minimum(...parameters) {
      return this.getGlslVector4Result(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @param  {GlslVector} parameter
    * @returns {GlslFloat}
    */
   dot(parameter) {
      return this.getGlslFloatResult([this, parameter], GLSL_OPERATOR.DOT);
   }
   /**
    * @returns {GlslFloat}
    */
   getLuminance() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LUMINANCE);
   }
}

class GlslMatrix3 extends GlslMatrix {
   /**
    * @param  {GlslFloat[][]} matrix3
    */
   constructor(matrix3 = undefined) {
      let customDeclaration = "";
      if (matrix3 !== undefined) {
         let matrix3GlslNames = [
            [null, null, null],
            [null, null, null],
            [null, null, null],
         ];
         for (let r = 0; r < matrix3.length; r++) {
            for (let c = 0; c < matrix3[0].length; c++) {
               matrix3GlslNames[r][c] = matrix3[r][c].getGlslName();
            }
         }
         if (matrix3 !== undefined) {
            customDeclaration =
               GLSL_VARIABLE_TYPE.MATRIX3 +
               "(" +
               matrix3GlslNames[0][0] +
               ", " +
               matrix3GlslNames[1][0] +
               ", " +
               matrix3GlslNames[2][0] +
               ", " +
               matrix3GlslNames[0][1] +
               ", " +
               matrix3GlslNames[1][1] +
               ", " +
               matrix3GlslNames[2][1] +
               ", " +
               matrix3GlslNames[0][2] +
               ", " +
               matrix3GlslNames[1][2] +
               ", " +
               matrix3GlslNames[2][2] +
               ")";
         }
      }
      super(customDeclaration);
   }
   /**
    * @returns {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.MATRIX3;
   }
   /**
    * @param  {...GlslFloat} addends
    * @returns {GlslMatrix3}
    */
   addFloat(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec3 to mat3.
    */
   addVector3() {
      throw new Error("Not possible to add vec3 to mat3.");
   }
   /**
    * @throws Not possible to add vec4 to mat3.
    */
   addVector4() {
      throw new Error("Not possible to add vec4 to mat3.");
   }
   /**
    * @param  {...GlslMatrix3} addends
    * @returns {GlslMatrix3}
    */
   addMatrix3(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @returns {GlslMatrix3}
    */
   subtractFloat(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws Not possible to subtract vec3 from mat3.
    */
   subtractVector3() {
      throw new Error("Not possible to subtract vec3 from mat3.");
   }
   /**
    * @throws {Error} Not possible to subtract vec4 from mat3.
    */
   subtractVector4() {
      throw new Error("Not possible to subtract vec4 from mat3.");
   }
   /**
    * @param  {...GlslMatrix3} subtrahends
    * @returns {GlslMatrix3}
    */
   subtractMatrix3(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslFloat} factors
    * @returns {GlslVariable}
    */
   multiplyFloat(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector3} factors
    * @returns {GlslVector3}
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec4 with mat3.
    */
   multiplyVector4() {
      throw new Error("Not possible to multiply vec4 with mat3.");
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @returns {GlslMatrix3}
    */
   multiplyMatrix3(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslFloat} divisors
    * @returns {GlslMatrix3}
    */
   divideFloat(...divisors) {
      return this.getGlslMatrix3Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @returns {GlslMatrix3}
    */
   inverse() {
      return this.getGlslMatrix3Result([this], GLSL_OPERATOR.INVERSE);
   }
}

/**
 * @global
 * @typedef {Shader} GLSL.Shader
 * @typedef {GlslRendering.render} GLSL.render
 * @typedef {GlslFloat} GLSL.Float
 * @typedef {GlslImage} GLSL.image
 * @typedef {GlslVector2} GLSL.Vector2
 * @typedef {GlslVector3} GLSL.Vector3
 * @typedef {GlslVector4} GLSL.Vector4
 * @typedef {GlslMatrix3} GLSL.Matrix3
 * @typedef {GlslUniformImage} GLSL.Uniform.Image
 * @typedef {GlslUniformFloat} GLSL.Uniform.Float
 */
const GLSL = {
   Shader: Shader,
   render: GlslRendering.render,
   Image: GlslImage,
   Integer: GlslInteger,
   Float: GlslFloat,
   Vector2: GlslVector2,
   Vector3: GlslVector3,
   Vector4: GlslVector4,
   Matrix3: GlslMatrix3,
   Uniform: { Image: GlslUniformImage, Float: GlslUniformFloat },
};
