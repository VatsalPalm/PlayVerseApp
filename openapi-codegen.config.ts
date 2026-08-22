import {
  generateSchemaTypes,
  generateReactQueryComponents,
} from "@openapi-codegen/typescript";
import { defineConfig } from "@openapi-codegen/cli";
export default defineConfig({
  playVerse: {
    from: {
      relativePath: "./openapi.json",
      source: "file",
    },
    outputDir: "/src/Api",
    to: async (context) => {
      const filenamePrefix = "playVerse";
      const { schemasFiles } = await generateSchemaTypes(context, {
        filenamePrefix,
      });
      await generateReactQueryComponents(context, {
        filenamePrefix,
        schemasFiles,
      });
    },
  },
  playVerse: {
    from: {
      relativePath: "./openapi.json",
      source: "file",
    },
    outputDir: "/src/Api",
    to: async (context) => {
      const filenamePrefix = "playVerse";
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
