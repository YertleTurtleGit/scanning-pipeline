//@ts-check
"use strict";

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

/** @type {{RED: number, GREEN: number, BLUE: number}} */
const LUMINANCE_CHANNEL_QUANTIFIER = { RED: 1 / 3, GREEN: 1 / 3, BLUE: 1 / 3 };

/**
 * @typedef {string} GLSL_VARIABLE
 */
const GLSL_VARIABLE = {
   UV: "uv",
   TEX: "tex",
   POS: "pos",
   OUT: "fragColor",
};

/**
 * @typedef {string} GLSL_VARIABLE_TYPE
 */
const GLSL_VARIABLE_TYPE = {
   FLOAT: "float",
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
 * @typedef {{GLSL_NAME: String, TYPE: OPERATOR_TYPE}} GLSL_OPERATOR
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

   LUMINANCE: { GLSL_NAME: "luminance", TYPE: OPERATOR_TYPE.CUSTOM },
   CHANNEL: { GLSL_NAME: "channel", TYPE: OPERATOR_TYPE.CUSTOM },
   VEC3_TO_VEC4: { GLSL_NAME: "vec3_to_vec4", TYPE: OPERATOR_TYPE.CUSTOM },
};

class Shader {
   /**
    * Creates an instance of Shader.
    * @param  {{ width: number; height: number }} dimensions
    * @memberof Shader
    */
   constructor(dimensions) {
      /**
       * @private
       * @type {GlslShader}
       * @memberof Shader
       */
      this.glslShader = null;
      this.dimensions = dimensions;
   }
   /**
    * @return {void}@memberof Shader
    */
   bind() {
      if (this.glslShader !== null) {
         console.warn("Shader is already bound!");
      }
      this.glslShader = new GlslShader(this.dimensions);
   }
   /**
    * @return {void}@memberof Shader
    */
   unbind() {
      GlslShader.currentShader = null;
      this.glslShader = null;
   }
   /**
    * @return {void}@memberof Shader
    */
   purge() {
      if (this.glslShader === null) {
         console.warn("No shader bound to purge!");
      } else {
         this.glslShader.reset();
         this.unbind();
      }
   }
}

class GlslShader {
   /**
    * Creates an instance of GlslShader.
    * @param  {{ width: number; height: number }} dimensions
    * @memberof GlslShader
    */
   constructor(dimensions) {
      GlslShader.currentShader = this;
      /**
       * @private
       * @type {GPU_GL_FLOAT_PRECISION}
       */
      this.floatPrecision = FLOAT_PRECISION;
      /**
       * @private
       * @type {GlslImage[]}
       */
      this.glslImages = [];
      /**
       * @private
       * @type {string[]}
       */
      this.glslCommands = [];
      this.glslContext = new GlslContext(dimensions);
   }
   /**
    * @static
    * @return {GlslShader}
    */
   static getCurrentShader() {
      return GlslShader.currentShader;
   }
   /**
    * @return {void}
    */
   reset() {
      this.glslContext.reset();
      GlslShader.currentShader = null;
   }
   /**
    * @static
    * @param  {string} glslCommand
    * @return {void}@memberof GlslShader
    */
   static addGlslCommandToCurrentShader(glslCommand) {
      GlslShader.getCurrentShader().addGlslCommand(glslCommand);
   }
   /**
    * @static
    * @param  {GlslImage} glslImage
    * @return {void}@memberof GlslShader
    */
   static addGlslImageToCurrentShader(glslImage) {
      GlslShader.getCurrentShader().addGlslImage(glslImage);
   }
   /**
    * @static
    * @return {GlslContext}
    */
   static getGlslContext() {
      return GlslShader.getCurrentShader().glslContext;
   }
   /**
    * @return {GlslImage[]}
    */
   getGlslImages() {
      return this.glslImages;
   }
   /**
    * @return {string}
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
    * @return {string}
    */
   getFragmentShaderSource(outVariable) {
      let imageDefinitions = [];
      for (let i = 0; i < this.glslImages.length; i++) {
         imageDefinitions.push(this.glslImages[i].getGlslDefinition());
      }
      return [
         "#version 300 es",
         "precision " + this.floatPrecision + " float;",
         "",
         "in vec2 " + GLSL_VARIABLE.UV + ";",
         "out vec4 " + GLSL_VARIABLE.OUT + ";",
         "",
         ...imageDefinitions,
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
    * @return {void}
    */
   addGlslCommand(glslCommand) {
      this.glslCommands.push(glslCommand);
   }
   /**
    * @private
    * @param  {GlslImage} glslImage
    * @return {void}
    */
   addGlslImage(glslImage) {
      this.glslImages.push(glslImage);
   }
}
/**
 * @static
 * @type {GlslShader}
 */
GlslShader.currentShader;

class GlslContext {
   /**
    * Creates an instance of GlslContext.
    * @param  {{ width: number; height: number }} dimensions
    */
   constructor(dimensions) {
      this.glslShader = GlslShader.getCurrentShader();
      this.glCanvas = document.createElement("canvas");
      this.glCanvas.width = dimensions.width;
      this.glCanvas.height = dimensions.height;
      this.glContext = this.glCanvas.getContext("webgl2");
   }
   /**
    * @return {void}
    */
   reset() {
      this.glContext.flush();
      this.glContext.finish();
      this.glCanvas.remove();
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }
   /**
    * @return {WebGL2RenderingContext}
    */
   getGlContext() {
      return this.glContext;
   }
   /**
    * @param  {GlslVector4} outVariable
    * @return Uint8Array
    */
   renderPixelArray(outVariable) {
      return this.renderToPixelArray(outVariable);
   }
   /**
    * @return string
    */
   renderDataUrl() {
      return this.glCanvas.toDataURL();
   }
   /**
    * @private
    * @param  {GlslVector4} outVariable
    * @return {WebGLProgram}
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

      this.glContext.shaderSource(vertexShader, vertexShaderSource);
      this.glContext.shaderSource(fragmentShader, fragmentShaderSource);
      console.log("Compiling shader program.");
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
    * @return {void}
    */
   loadGlslImages(shaderProgram) {
      const glslImages = this.glslShader.getGlslImages();
      console.log("Loading " + glslImages.length + " image(s) for gpu.");
      for (let i = 0; i < glslImages.length; i++) {
         glslImages[i].loadIntoShaderProgram(this.glContext, shaderProgram, i);
      }
   }
   /**
    * @param  {WebGLProgram} shaderProgram
    * @return WebGLVertexArrayObject

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
    * @return {void}@memberof GlslContext
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
    * @return {Uint8Array}
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
    * @return {Uint8Array}
    */
   renderToPixelArray(outVariable) {
      this.drawCall(outVariable);
      const pixelArray = this.readToPixelArray();
      return pixelArray;
   }
   /**
    * @param  {GlslVector4} outVariable
    * @return {void}
    */
   drawCall(outVariable) {
      const shaderProgram = this.createShaderProgram(outVariable);
      this.glContext.useProgram(shaderProgram);
      this.loadGlslImages(shaderProgram);
      console.log("Rendering on gpu.");
      const vaoFrame = this.getFrameVAO(shaderProgram);
      this.drawArraysFromVAO(vaoFrame);
   }
}

class GlslRendering {
   /**
    * Creates an instance of GlslRendering.
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
    * @return {GlslRendering}
    */
   static render(outVariable) {
      return new GlslRendering(GlslShader.getGlslContext(), outVariable);
   }
   /**
    * @return {Uint8Array}
    */
   getPixelArray() {
      if (!this.pixelArray) {
         this.pixelArray = this.glslContext.renderPixelArray(this.outVariable);
      }
      return this.pixelArray;
   }
   /**
    * @return {string}
    */
   getDataUrl() {
      if (!this.dataUrl) {
         this.getPixelArray();
         this.dataUrl = this.glslContext.renderDataUrl();
      }
      return this.dataUrl;
   }
   /**
    * @return {Promise<HTMLImageElement>}
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
    * Creates an instance of GlslOperation.
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
    * @return {string}
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
    * @return {string}
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

class GlslImage {
   /**
    * Creates an instance of GlslImage.
    * @param  {HTMLImageElement} jsImage
    */
   constructor(jsImage) {
      this.jsImage = jsImage;
      this.uniformGlslName = GlslVariable.getUniqueName("uniform");
      this.glslVector4 = new GlslVector4(
         null,
         "texture(" + this.uniformGlslName + ", " + GLSL_VARIABLE.UV + ")"
      );
      GlslShader.addGlslImageToCurrentShader(this);
   }
   /**
    * @static
    * @param  {HTMLImageElement} jsImage
    * @return {GlslVector4}
    */
   static load(jsImage) {
      let glslImage = new GlslImage(jsImage);
      return glslImage.glslVector4;
   }
   /**
    * @return {string}
    */
   getGlslDefinition() {
      return "uniform sampler2D " + this.uniformGlslName + ";";
   }
   /**
    * @param  {WebGL2RenderingContext} glContext
    * @return {WebGLTexture}
    */
   createTexture(glContext) {
      let texture = glContext.createTexture();
      glContext.bindTexture(glContext.TEXTURE_2D, texture);
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_S,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_T,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MIN_FILTER,
         glContext.LINEAR
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MAG_FILTER,
         glContext.LINEAR
      );
      glContext.texImage2D(
         glContext.TEXTURE_2D,
         0,
         glContext.RGBA,
         glContext.RGBA,
         glContext.UNSIGNED_BYTE,
         this.jsImage
      );
      return texture;
   }
   /**
    * @param  {WebGL2RenderingContext} glContext
    * @param  {WebGLProgram} shaderProgram
    * @param  {number} textureUnit
    * @return {void}
    */
   loadIntoShaderProgram(glContext, shaderProgram, textureUnit) {
      glContext.activeTexture(glContext.TEXTURE0 + textureUnit);
      glContext.bindTexture(
         glContext.TEXTURE_2D,
         this.createTexture(glContext)
      );
      glContext.uniform1i(
         glContext.getUniformLocation(shaderProgram, this.uniformGlslName),
         textureUnit
      );
   }
}

/** @abstract */ class GlslVariable {
   /**
    * @abstract
    * @param {string} [customDeclaration=""]
    * @memberof GlslVariable
    */
   constructor(customDeclaration = "") {
      this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
      if (customDeclaration !== null) {
         if (customDeclaration !== "") {
            customDeclaration = " = " + customDeclaration;
         }
         GlslShader.addGlslCommandToCurrentShader(
            this.getGlslVarType() +
               " " +
               this.getGlslName() +
               customDeclaration +
               ";"
         );
      }
   }
   /**
    * @static
    * @param  {string} prefix
    * @return {string}
    */
   static getUniqueName(prefix) {
      GlslVariable.uniqueNumber++;
      return prefix + "_" + GlslVariable.uniqueNumber.toString();
   }
   /**
    * @static
    * @param  {GlslVariable[]} glslVariables
    * @return {string[]}
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
    * @return {string}
    */
   getGlslName() {
      return this.glslName;
   }
   /**
    * @private
    * @param  {GlslOperation} glslOperation
    * @return {void}
    */
   declareGlslResult(glslOperation) {
      GlslShader.addGlslCommandToCurrentShader(glslOperation.getDeclaration());
   }
   /**
    * @protected
    * @param  {GlslVariable[]} operants
    * @param  {GLSL_OPERATOR} operator
    * @return {GlslFloat}
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
    * @return {GlslVector3}
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
    * @return {GlslVector4}
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
    * @return {GlslMatrix3}
    */
   getGlslMatrix3Result(operants, operator) {
      const glslResult = new GlslMatrix3();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   /**
    * @name getGlslVarType
    * @abstract
    * @return {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      throw new Error("Cannot call an abstract method.");
      return;
   }
   /**
    * @name addFloat
    * @abstract
    * @param  {...GlslFloat[]} addends
    * @return {GlslVariable}
    */
   /**
    * @name addVector3
    * @abstract
    * @param  {...GlslVector3[]} addends
    * @return {GlslVariable}
    */
   /**
    * @name addVector4
    * @abstract
    * @param  {...GlslVector4[]} addends
    * @return {GlslVariable}
    */
   /**
    * @name addMatrix3
    * @abstract
    * @param  {...GlslMatrix3[]} addends
    * @return {GlslVariable}
    */

   /**
    * @name subtractFloat
    * @abstract
    * @param  {...GlslFloat[]} subtrahends
    * @return {GlslVariable}
    */
   /**
    * @name subtractVector3
    * @abstract
    * @param  {...GlslVector3[]} subtrahends
    * @return {GlslVariable}
    */
   /**
    * @name subtractVector4
    * @abstract
    * @param  {...GlslVector4[]} subtrahends
    * @return {GlslVariable}
    */
   /**
    * @name subtractMatrix3
    * @abstract
    * @param  {...GlslMatrix3[]} subtrahends
    * @return {GlslVariable}
    */
   /**
    * @name multiplyFloat
    * @abstract
    * @param  {...GlslFloat[]} factors
    * @return {GlslVariable}
    */
   /**
    * @name multiplyVector3
    * @abstract
    * @param  {...GlslVector3[]} factors
    * @return {GlslVariable}
    */
   /**
    * @name multiplyVector4
    * @abstract
    * @param  {...GlslVector4[]} factors
    * @return {GlslVariable}
    */
   /**
    * @name multiplyMatrix3
    * @abstract
    * @param  {...GlslMatrix3[]} factors
    * @return {GlslVariable}
    */
   /**
    * @name divideFloat
    * @abstract
    * @param  {...GlslFloat[]} divisors
    * @return {GlslVariable}
    */
}

/**
 * @public
 * @static
 * @type {number}
 */
GlslVariable.uniqueNumber = 0;

/** @abstract */ class GlslVector extends GlslVariable {
   /**
    * @param {number} channel
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
    * @return {GlslVector}
    */
}

/** @abstract */ class GlslMatrix extends GlslVariable {
   /**
    * @abstract
    * @name inverse
    * @return {GlslMatrix}
    */
}

class GlslInteger extends GlslVariable {
   /**
    * Creates an instance of GlslInteger.
    * @param  {number} [jsNumber=null]
    */
   constructor(jsNumber = null) {
      if (jsNumber !== null) {
         super(null);
         this.glslName = jsNumber.toString();
      } else {
         super();
      }
   }
   /**
    * @return {GLSL_VARIABLE_TYPE}
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.INTEGER;
   }
   /**
    * @param  {...GlslFloat} addends
    * @return {GlslVariable}
    */
   addFloat(...addends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector3} addends
    * @return {GlslVariable}
    */
   addVector3(...addends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector4} addends
    * @return {GlslVariable}
    */
   addVector4(...addends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslMatrix3} addends
    * @return {GlslVariable}
    */
   addMatrix3(...addends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @return {GlslVariable}
    */
   subtractFloat(...subtrahends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector3} subtrahends
    * @return {GlslVariable}
    */
   subtractVector3(...subtrahends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector4} subtrahends
    * @return {GlslVariable}
    */
   subtractVector4(...subtrahends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslMatrix3} subtrahends
    * @return {GlslVariable}
    */
   subtractMatrix3(...subtrahends) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslFloat} factors
    * @return {GlslVariable}
    */
   multiplyFloat(...factors) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector3} factors
    * @return {GlslVariable}
    */
   multiplyVector3(...factors) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslVector4} factors
    * @return {GlslVariable}
    */
   multiplyVector4(...factors) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @return {GlslVariable}
    */
   multiplyMatrix3(...factors) {
      throw new Error("Method not implemented.");
   }
   /**
    * @param  {...GlslFloat} divisors
    * @return {GlslVariable}
    */
   divideFloat(...divisors) {
      throw new Error("Method not implemented.");
   }
}

class GlslFloat extends GlslVariable {
   /**
    * @static
    * @param  {number} number
    * @return {string}
    * @memberof GlslFloat
    */
   static getJsNumberAsString(number) {
      if (Math.trunc(number) === number) {
         return number.toString() + ".0";
      }
      if (number.toString().includes("e-")) {
         //console.warn(number.toString() + " is converted to zero.");
         return "0.0";
      }
      return number.toString();
   }
   /**
    * Creates an instance of GlslFloat.
    * @param  {number} [jsNumber=null]
    * @memberof GlslFloat
    */
   constructor(jsNumber = null) {
      if (jsNumber !== null) {
         super(null);
         this.glslName = GlslFloat.getJsNumberAsString(jsNumber);
      } else {
         super();
      }
   }
   /**
    * @return string
    * @memberof GlslFloat
    */
   getGlslName() {
      return this.glslName;
   }
   /**
    * @return GLSL_TYPE
    * @memberof GlslFloat
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.FLOAT;
   }
   /**
    * @param  {...GlslFloat} addends
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   addFloat(...addends) {
      return this.getGlslFloatResult(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslVector3} addends
    * @return {GlslVector3}
    * @memberof GlslFloat
    */
   addVector3(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslVector4} addends
    * @return {GlslVector4}
    * @memberof GlslFloat
    */
   addVector4(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslMatrix3} addends
    * @return GlslMatrix3
    * @memberof GlslFloat
    */
   addMatrix3(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   subtractFloat(...subtrahends) {
      return this.getGlslFloatResult(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslVector3} subtrahends
    * @return {GlslVector3}
    * @memberof GlslFloat
    */
   subtractVector3(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslVector4} subtrahends
    * @return {GlslVector4}
    * @memberof GlslFloat
    */
   subtractVector4(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslMatrix3} subtrahends
    * @return GlslMatrix3
    * @memberof GlslFloat
    */
   subtractMatrix3(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslFloat} factors
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   multiplyFloat(...factors) {
      return this.getGlslFloatResult(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector3} factors
    * @return {GlslVector3}
    * @memberof GlslFloat
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector4} factors
    * @return {GlslVector4}
    * @memberof GlslFloat
    */
   multiplyVector4(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @return GlslMatrix3
    * @memberof GlslFloat
    */
   multiplyMatrix3(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslFloat} divisors
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   divideFloat(...divisors) {
      return this.getGlslFloatResult(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @return {GlslFloat}
    */
   abs() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   maximum(...parameters) {
      return this.getGlslFloatResult(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   minimum(...parameters) {
      return this.getGlslFloatResult(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @return {GlslFloat}
    * @memberof GlslFloat
    */
   radians() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.RADIANS);
   }
   /**
    * @return {GlslFloat}
    */
   sin() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.SINE);
   }
   /**
    * @return {GlslFloat}
    */
   cos() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.COSINE);
   }
   /**
    * @return {GlslFloat}
    */
    acos() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.ARC_COSINE);
   }

}

class GlslVector3 extends GlslVector {
   /**
    * Creates an instance of GlslVector3.
    * @param  {[GlslFloat, GlslFloat, GlslFloat]} [vector3=undefined]
    
    */
   constructor(vector3 = undefined) {
      let customDeclaration = "";
      if (vector3 !== undefined) {
         let vector3GlslNames = [];
         for (let i = 0; i < vector3.length; i++) {
            vector3GlslNames.push(vector3[i].getGlslName());
         }
         customDeclaration =
            GLSL_VARIABLE_TYPE.VECTOR3 +
            "(" +
            vector3GlslNames.join(", ") +
            ")";
      }
      super(customDeclaration);
   }
   /**
    * @return {GLSL_VARIABLE_TYPE}
    
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.VECTOR3;
   }
   /**
    * @param  {...GlslFloat} addends
    * @return {GlslVector3}
    
    */
   addFloat(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslVector3} addends
    * @return {GlslVector3}
    
    */
   addVector3(...addends) {
      return this.getGlslVector3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec4 to vec3.
    * @param  {...GlslVector4} addends
    * @return {undefined}
    
    */
   addVector4(...addends) {
      throw new Error("Not possible to add vec4 to vec3.");
   }
   /**
    * @throws {Error} Not possible to add mat3 to vec3.
    * @param  {...GlslMatrix3} addends
    * @return {undefined}
    
    */
   addMatrix3(...addends) {
      throw new Error("Not possible to add mat3 to vec3.");
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @return {GlslVector3}
    
    */
   subtractFloat(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslVector3} subtrahends
    * @return {GlslVector3}
    
    */
   subtractVector3(...subtrahends) {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract vec4 from vec3.
    * @param  {...GlslVector4} subtrahends
    * @return {undefined}
    
    */
   subtractVector4(...subtrahends) {
      throw new Error("Not possible to subtract vec4 from vec3.");
   }
   /**
    * @throws {Error} Not possible to subtract mat3 from vec3.
    * @param  {...GlslMatrix3} subtrahends
    * @return {undefined}
    
    */
   subtractMatrix3(...subtrahends) {
      throw new Error("Not possible to subtract mat3 from vec3.");
   }
   /**
    * @param  {...GlslFloat} factors
    * @return {GlslVector3}
    
    */
   multiplyFloat(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector3} factors
    * @return {GlslVector3}
    
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec4 with vec3.
    * @param  {...GlslVector4} factors
    * @return {undefined}
    
    */
   multiplyVector4(...factors) {
      throw new Error("Not possible to multiply vec4 with vec3.");
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @return {GlslVector3}
    
    */
   multiplyMatrix3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslFloat} divisors
    * @return {GlslVector3}
    
    */
   divideFloat(...divisors) {
      return this.getGlslVector3Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @return {GlslFloat}
    
    */
   length() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LENGTH);
   }
   /**
    * @return {GlslVector3}
    */
   abs() {
      return this.getGlslVector3Result([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @return {GlslVector3}
    */
   normalize() {
      return this.getGlslVector3Result([this], GLSL_OPERATOR.NORMALIZE);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslVector3}
    
    */
   maximum(...parameters) {
      return this.getGlslVector3Result(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslVector3}
    
    */
   minimum(...parameters) {
      return this.getGlslVector3Result(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @param  {GlslVector} parameter
    * @return {GlslFloat}
    
    */
   dot(parameter) {
      return this.getGlslFloatResult([this, parameter], GLSL_OPERATOR.DOT);
   }
   /**
    * @param  {GlslFloat} [fourthChannel=new GlslFloat(1)]
    * @return {GlslVector4}
    
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
    * Creates an instance of GlslVector4.
    * @param  {[GlslFloat, GlslFloat, GlslFloat, GlslFloat]} [vector4=undefined]
    * @param  {string} [customDeclaration=""]
    */
   constructor(vector4 = undefined, customDeclaration = "") {
      if (customDeclaration === "") {
         if (vector4 !== undefined && vector4 !== null) {
            let vector4GlslNames = [];
            for (let i = 0; i < vector4.length; i++) {
               vector4GlslNames.push(vector4[i].getGlslName());
            }
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
    * @return {GLSL_VARIABLE_TYPE}
    * @memberof GlslVector4
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.VECTOR4;
   }
   /**
    * @param  {...GlslFloat} addends
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   addFloat(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec3 to vec4.
    * @param  {...GlslVector3} addends
    * @return {undefined}
    * @memberof GlslVector4
    */
   addVector3(...addends) {
      throw new Error("Not possible to add vec3 to vec4.");
   }
   /**
    * @param  {...GlslVector4} addends
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   addVector4(...addends) {
      return this.getGlslVector4Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add mat3 to vec4.
    * @param  {...GlslMatrix3} addends
    * @return {undefined}
    * @memberof GlslVector4
    */
   addMatrix3(...addends) {
      throw new Error("Not possible to add mat3 to vec4.");
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   subtractFloat(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract vec3 from vec4.
    * @param  {...GlslVector3} subtrahends
    * @return {undefined}
    * @memberof GlslVector4
    */
   subtractVector3(...subtrahends) {
      throw new Error("Not possible to subtract vec3 from vec4.");
   }
   /**
    * @param  {...GlslVector4} subtrahends
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   subtractVector4(...subtrahends) {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws {Error} Not possible to subtract mat3 from vec4.
    * @param  {...GlslMatrix3} subtrahends
    * @return {undefined}
    * @memberof GlslVector4
    */
   subtractMatrix3(...subtrahends) {
      throw new Error("Not possible to subtract mat3 from vec4.");
   }
   /**
    * @param  {...GlslFloat} factors
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   multiplyFloat(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec3 with vec4.
    * @param  {...GlslVector3} factors
    * @return {undefined}
    * @memberof GlslVector4
    */
   multiplyVector3(...factors) {
      throw new Error("Not possible to multiply vec3 with vec4.");
   }
   /**
    * @param  {...GlslVector4} factors
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   multiplyVector4(...factors) {
      return this.getGlslVector4Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply mat3 with vec4.
    * @param  {...GlslMatrix3} factors
    * @return {undefined}
    * @memberof GlslVector4
    */
   multiplyMatrix3(...factors) {
      throw new Error("Not possible to multiply mat3 with vec4.");
   }
   /**
    * @param  {...GlslFloat} divisors
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   divideFloat(...divisors) {
      return this.getGlslVector4Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @return {GlslVector4}
    */
   abs() {
      return this.getGlslVector4Result([this], GLSL_OPERATOR.ABS);
   }
   /**
    * @return {GlslFloat}
    * @memberof GlslVector4
    */
   length() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LENGTH);
   }
   /**
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   normalize() {
      return this.getGlslVector4Result([this], GLSL_OPERATOR.NORMALIZE);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   maximum(...parameters) {
      return this.getGlslVector4Result(parameters, GLSL_OPERATOR.MAXIMUM);
   }
   /**
    * @param  {...GlslVariable} parameters
    * @return {GlslVector4}
    * @memberof GlslVector4
    */
   minimum(...parameters) {
      return this.getGlslVector4Result(parameters, GLSL_OPERATOR.MINIMUM);
   }
   /**
    * @param  {GlslVector} parameter
    * @return {GlslFloat}
    * @memberof GlslVector4
    */
   dot(parameter) {
      return this.getGlslFloatResult([this, parameter], GLSL_OPERATOR.DOT);
   }
   /**
    * @return {GlslFloat}
    * @memberof GlslVector4
    */
   getLuminanceFloat() {
      return this.getGlslFloatResult([this], GLSL_OPERATOR.LUMINANCE);
   }
}

class GlslMatrix3 extends GlslMatrix {
   /**
    * Creates an instance of GlslMatrix3.
    * @param  {[
    *          [GlslFloat, GlslFloat, GlslFloat],
    *          [GlslFloat, GlslFloat, GlslFloat],
    *          [GlslFloat, GlslFloat, GlslFloat]
    *       ]} [matrix3=undefined]
    * @memberof GlslMatrix3
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
    * @return {GLSL_VARIABLE_TYPE}
    * @memberof GlslMatrix3
    */
   getGlslVarType() {
      return GLSL_VARIABLE_TYPE.MATRIX3;
   }
   /**
    * @param  {...GlslFloat} addends
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   addFloat(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @throws {Error} Not possible to add vec3 to mat3.
    * @param  {...GlslVector3} addends
    * @return {undefined}
    * @memberof GlslMatrix3
    */
   addVector3(...addends) {
      throw new Error("Not possible to add vec3 to mat3.");
   }
   /**
    * @throws Not possible to add vec4 to mat3.
    * @param  {...GlslVector4} addends
    * @return {undefined}
    * @memberof GlslMatrix3
    */
   addVector4(...addends) {
      throw new Error("Not possible to add vec4 to mat3.");
   }
   /**
    * @param  {...GlslMatrix3} addends
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   addMatrix3(...addends) {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATOR.ADD);
   }
   /**
    * @param  {...GlslFloat} subtrahends
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   subtractFloat(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @throws Not possible to subtract vec3 from mat3.
    * @param  {...GlslVector3} subtrahends
    * @return {undefined}
    * @memberof GlslMatrix3
    */
   subtractVector3(...subtrahends) {
      throw new Error("Not possible to subtract vec3 from mat3.");
   }
   /**
    * @throws {Error} Not possible to subtract vec4 from mat3.
    * @param  {...GlslVector4} subtrahends
    * @return {undefined}
    * @memberof GlslMatrix3
    */
   subtractVector4(...subtrahends) {
      throw new Error("Not possible to subtract vec4 from mat3.");
   }
   /**
    * @param  {...GlslMatrix3} subtrahends
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   subtractMatrix3(...subtrahends) {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATOR.SUBTRACT);
   }
   /**
    * @param  {...GlslFloat} factors
    * @return {GlslVariable}
    * @memberof GlslMatrix3
    */
   multiplyFloat(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslVector3} factors
    * @return {GlslVector3}
    * @memberof GlslMatrix3
    */
   multiplyVector3(...factors) {
      return this.getGlslVector3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @throws {Error} Not possible to multiply vec4 with mat3.
    * @param  {...GlslVector4} factors
    * @return {undefined}
    * @memberof GlslMatrix3
    */
   multiplyVector4(...factors) {
      throw new Error("Not possible to multiply vec4 with mat3.");
   }
   /**
    * @param  {...GlslMatrix3} factors
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   multiplyMatrix3(...factors) {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATOR.MULTIPLY);
   }
   /**
    * @param  {...GlslFloat} divisors
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   divideFloat(...divisors) {
      return this.getGlslMatrix3Result(divisors, GLSL_OPERATOR.DIVIDE);
   }
   /**
    * @return GlslMatrix3
    * @memberof GlslMatrix3
    */
   inverse() {
      return this.getGlslMatrix3Result([this], GLSL_OPERATOR.INVERSE);
   }
}
