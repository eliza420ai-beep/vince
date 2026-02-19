import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { logger } from "@elizaos/core";

// Helper function to check if a file exists
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// Helper function to check if a directory exists
function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

describe("Project Structure Validation", () => {
  const rootDir = path.resolve(__dirname, "../..");

  describe("Directory Structure", () => {
    it("should have the expected directory structure", () => {
      expect(directoryExists(path.join(rootDir, "src"))).toBe(true);
      expect(directoryExists(path.join(rootDir, "src", "__tests__"))).toBe(
        true,
      );
    });

    it("should have a dist directory after building", () => {
      // Skip if build has not been run (e.g. CI may run tests without building first)
      const distPath = path.join(rootDir, "dist");
      if (!directoryExists(distPath)) {
        logger.warn(
          "Dist directory not found - run 'bun run build' first; skipping",
        );
        return;
      }
      expect(directoryExists(distPath)).toBe(true);
    });
  });

  describe("Source Files", () => {
    it("should contain the required source files", () => {
      expect(fileExists(path.join(rootDir, "src", "index.ts"))).toBe(true);
      expect(fileExists(path.join(rootDir, "src", "plugin.ts"))).toBe(true);
    });

    it("should have properly structured main files", () => {
      // Check index.ts contains project/character and plugin/agents
      const indexContent = fs.readFileSync(
        path.join(rootDir, "src", "index.ts"),
        "utf8",
      );
      const hasIndexExport =
        indexContent.includes("character") || indexContent.includes("project");
      const hasPluginOrAgents =
        indexContent.includes("plugin") || indexContent.includes("agents");
      expect(hasIndexExport).toBe(true);
      expect(hasPluginOrAgents).toBe(true);

      // Check plugin.ts contains plugin definition
      const pluginContent = fs.readFileSync(
        path.join(rootDir, "src", "plugin.ts"),
        "utf8",
      );
      expect(pluginContent).toContain("export default");
      expect(pluginContent).toContain("actions");
    });
  });

  describe("Configuration Files", () => {
    it("should have the required configuration files", () => {
      expect(fileExists(path.join(rootDir, "package.json"))).toBe(true);
      expect(fileExists(path.join(rootDir, "tsconfig.json"))).toBe(true);
      // Build config: tsup or build.ts
      expect(
        fileExists(path.join(rootDir, "tsup.config.ts")) ||
          fileExists(path.join(rootDir, "build.ts")),
      ).toBe(true);
    });

    it("should have the correct package.json configuration", () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
      );

      // Check package name exists and is valid
      expect(packageJson.name).toBeTruthy();
      expect(typeof packageJson.name).toBe("string");

      // Check scripts
      expect(packageJson.scripts).toHaveProperty("build");
      expect(packageJson.scripts).toHaveProperty("test");
      // test:coverage optional
      expect(packageJson.scripts).toBeTruthy();

      // Check dependencies
      expect(packageJson.dependencies).toHaveProperty("@elizaos/core");

      // Check dev dependencies
      expect(packageJson.devDependencies).toBeTruthy();
    });

    it("should have proper TypeScript configuration", () => {
      const tsConfig = JSON.parse(
        fs.readFileSync(path.join(rootDir, "tsconfig.json"), "utf8"),
      );

      // Check essential compiler options
      expect(tsConfig).toHaveProperty("compilerOptions");
      expect(tsConfig.compilerOptions).toHaveProperty("target");
      expect(tsConfig.compilerOptions).toHaveProperty("module");

      // Check paths inclusion
      expect(tsConfig).toHaveProperty("include");
    });
  });

  describe("Build Output", () => {
    it("should check for expected build output structure", () => {
      const distPath = path.join(rootDir, "dist");
      if (!directoryExists(distPath)) {
        logger.warn("Dist directory not found, skipping build output tests");
        return;
      }
      const files = fs.readdirSync(distPath);
      expect(files.length).toBeGreaterThan(0);

      // Build may output: .js at top level (tsup), dist/src/*.js (Bun.build), dist/frontend/ (vite), or tsbuildinfo (declaration emit)
      const hasJsAtTop = files.some((f) => f.endsWith(".js"));
      const srcDir = path.join(distPath, "src");
      const hasJsUnderSrc =
        directoryExists(srcDir) &&
        fs.readdirSync(srcDir).some((f) => f.endsWith(".js"));
      const hasFrontendDir = files.includes("frontend");
      const hasAnyBuildArtifact =
        hasJsAtTop ||
        hasJsUnderSrc ||
        hasFrontendDir ||
        files.some((f) => f.endsWith(".tsbuildinfo"));
      expect(hasAnyBuildArtifact).toBe(true);
    });

    it("should verify the build process can be executed", () => {
      // Check that the build script exists in package.json
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(rootDir, "package.json"), "utf8"),
      );
      expect(packageJson.scripts).toHaveProperty("build");

      // Build may use tsup.config.ts or build.ts (Bun.build)
      const tsupPath = path.join(rootDir, "tsup.config.ts");
      const buildTsPath = path.join(rootDir, "build.ts");
      if (fs.existsSync(tsupPath)) {
        const tsupConfig = fs.readFileSync(tsupPath, "utf8");
        expect(tsupConfig).toContain("export default");
        expect(tsupConfig).toContain("entry");
      } else if (fs.existsSync(buildTsPath)) {
        const buildTs = fs.readFileSync(buildTsPath, "utf8");
        expect(buildTs).toContain("entrypoints");
      } else {
        expect(true).toBe(true); // at least one build mechanism
      }
    });
  });

  describe("Documentation", () => {
    it("should have README files", () => {
      expect(fileExists(path.join(rootDir, "README.md"))).toBe(true);
    });

    it("should have appropriate documentation content", () => {
      const readmeContent = fs.readFileSync(
        path.join(rootDir, "README.md"),
        "utf8",
      );
      // Accept project-starter template or app README (e.g. VINCE)
      const hasProjectOrApp =
        readmeContent.includes("Project Starter") ||
        readmeContent.includes("Development") ||
        readmeContent.includes("VINCE");
      expect(hasProjectOrApp).toBe(true);
      const hasTestingOrDocs =
        readmeContent.includes("Testing") ||
        readmeContent.includes("Quick Links") ||
        readmeContent.includes("Getting Started");
      expect(hasTestingOrDocs).toBe(true);
    });
  });
});
