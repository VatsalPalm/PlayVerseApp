import {
  generateSchemaTypes,
  generateReactQueryComponents,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
export default defineConfig({
  stackApi: {
    from: {
      relativePath: "./api.yaml",
      source: "file",
    },
    outputDir: "./src",
    to: async (context) => {
      const filenamePrefix = "stackApi";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
  testEducation: {
    from: {
      source: "url",
      url: "http://65.1.14.3:3336/swagger.json",
    },
    outputDir: "./src/Api",
    to: async (context) => {
      const filenamePrefix = "testEducation";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
  educationAPi: {
    from: {
      relativePath: "./openapi.json",
      source: "file",
    },
    outputDir: "./src",
    to: async (context) => {
      const filenamePrefix = "educationAPi";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
  educationApi: {
    from: {
      relativePath: "./openapi.json",
      source: "file",
    },
    outputDir: "./src/Api",
    to: async (context) => {
      const filenamePrefix = "educationApi";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
});
