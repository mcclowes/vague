# Vague Language Support for VS Code

Syntax highlighting for [Vague](https://github.com/mcclowes/vague) - a declarative language for generating realistic test data.

## Features

- Syntax highlighting for `.vague` files
- Syntax highlighting in markdown code blocks

## Installation

### From VSIX (Local)

1. Build the extension: `cd vscode-vague && npm install && npm run package`
2. In VS Code, open Command Palette (Cmd+Shift+P)
3. Run "Extensions: Install from VSIX..."
4. Select the generated `.vsix` file

### Manual (Development)

1. Copy or symlink this folder to `~/.vscode/extensions/vague-language`
2. Restart VS Code

## Syntax Highlighting

The extension highlights:

- **Keywords**: `schema`, `dataset`, `assume`, `if`, `and`, `or`, `not`, `any`, `of`, `where`, etc.
- **Types**: `string`, `int`, `decimal`, `boolean`, `date`
- **Built-in functions**: `sum`, `count`, `min`, `max`, `avg`
- **Operators**: `|` (superposition), `..` (ranges), `*` (cardinality), `^` (parent reference)
- **Comments**: `// single line comments`
- **Strings**: `"quoted strings"`
- **Numbers**: integers and decimals

## Example

```vague
schema Invoice {
  status: 0.6: "paid" | 0.3: "pending" | 0.1: "draft",
  amount: int in 100..10000,
  line_items: 1..5 * LineItem,
  total: = sum(line_items.amount),

  assume if status == "paid" {
    amount > 0
  }
}

dataset TestData {
  invoices: 100 * Invoice
}
```
