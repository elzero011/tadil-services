import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { PERMISSION_SET } from '../apps/tadil-api/src/app/auth/permissions';

const root = join(process.cwd(), 'apps/tadil-api/src/app');
const routeDecorators = new Set([
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Head',
  'Options',
  'All',
]);
const publicRoutes = new Set([
  'AppController.getFileStream',
  'AuthController.login',
  'AuthController.accept',
]);
const authenticatedRoutes = new Set([
  'AuthController.me',
  'AuthController.logout',
  'AuthController.password',
  'StaffPermissionsController.list',
  'CatalogSortingController.updateSorting',
  'UsersSortingController.updateSorting',
]);
const failures: string[] = [];
let count = 0;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? walk(path)
      : path.endsWith('.controller.ts')
      ? [path]
      : [];
  });
}
function decorators(node: ts.Node) {
  return (
    ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []
  ).flatMap((decorator) => {
    const call = decorator.expression;
    return ts.isCallExpression(call) && ts.isIdentifier(call.expression)
      ? [{ name: call.expression.text, args: call.arguments }]
      : [];
  });
}

for (const file of walk(root)) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  for (const controller of source.statements.filter(ts.isClassDeclaration)) {
    if (
      !decorators(controller).some(
        (decorator) => decorator.name === 'Controller'
      )
    )
      continue;
    for (const method of controller.members.filter(ts.isMethodDeclaration)) {
      const own = decorators(method);
      if (!own.some((decorator) => routeDecorators.has(decorator.name)))
        continue;
      count++;
      const key = `${controller.name?.text}.${method.name.getText(source)}`;
      const rules = [...own, ...decorators(controller)];
      if (rules.some((rule) => rule.name === 'Public')) {
        if (!publicRoutes.has(key))
          failures.push(`${key}: public route needs explicit review`);
        continue;
      }
      const permissions = rules.find(
        (rule) => rule.name === 'RequirePermissions'
      );
      if (permissions) {
        if (
          !permissions.args.length ||
          permissions.args.some(
            (argument) =>
              !ts.isStringLiteral(argument) ||
              !PERMISSION_SET.has(argument.text)
          )
        )
          failures.push(`${key}: invalid permission metadata`);
      } else if (rules.some((rule) => rule.name === 'AuthenticatedRoute')) {
        if (!authenticatedRoutes.has(key))
          failures.push(
            `${key}: authenticated-only route needs explicit review`
          );
      } else failures.push(`${key}: unclassified endpoint`);
    }
  }
}
if (!count) failures.push('No API endpoints found');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `All ${count} API endpoints have reviewed access classifications and valid permissions.`
  );
