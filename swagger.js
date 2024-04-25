const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Delivery API",
      version: "1.0.0",
      description: "A simple Express.js API for calculating delivery costs",
    },
    servers: [
      {
        url: "http://localhost:4000", // Update this URL when deploying to Render
        description: "Local server",
      },
    ],
  },
  apis: ["./index.js"], // Path to the main application file
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
