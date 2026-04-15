import { table, type Alignment, type TableUserConfig } from 'table'

type TableColumnConfig = NonNullable<TableUserConfig['columns']>[number]

interface TableColumn {
  header: string
  width: number
  minWidth?: number
  alignment?: Alignment
  truncate?: number
  wrapWord?: boolean
}

interface TableConfig {
  columns: TableColumn[]
  rows: string[][]
}

const roundedBorder = {
  topBody: '─',
  topJoin: '┬',
  topLeft: '╭',
  topRight: '╮',
  bottomBody: '─',
  bottomJoin: '┴',
  bottomLeft: '╰',
  bottomRight: '╯',
  bodyLeft: '│',
  bodyRight: '│',
  bodyJoin: '│',
  joinBody: '─',
  joinLeft: '├',
  joinRight: '┤',
  joinJoin: '┼',
  joinMiddleDown: '┬',
  joinMiddleLeft: '├',
  joinMiddleRight: '┤',
  joinMiddleUp: '┴',
  headerJoin: '┬',
} as const

export function renderCliTable(config: TableConfig): string[] {
  const columnWidths = fitColumnWidths(config.columns, process.stdout.columns)
  const data = [config.columns.map((column) => column.header), ...config.rows]
  const tableConfig: TableUserConfig = {
    border: roundedBorder,
    columnDefault: {
      paddingLeft: 1,
      paddingRight: 1,
      truncate: 24,
    },
    columns: Object.fromEntries(
      config.columns.map((column, index) => [
        index,
        buildColumnConfig(column, columnWidths[index]),
      ]),
    ),
    drawHorizontalLine: (index, size) =>
      index === 0 || index === 1 || index === size,
  }

  return table(data, tableConfig).trimEnd().split('\n')
}

function buildColumnConfig(
  column: TableColumn,
  width: number,
): TableColumnConfig {
  const config = {
    alignment: column.alignment ?? 'left',
    width,
    wrapWord: column.wrapWord ?? false,
  }

  if (column.truncate === undefined) return config

  return {
    ...config,
    truncate: Math.min(column.truncate, width),
  }
}

function fitColumnWidths(
  columns: TableColumn[],
  terminalWidth: number | undefined,
): number[] {
  const fallbackWidth = 100
  const availableWidth = terminalWidth ?? fallbackWidth
  const widths = columns.map((column) => column.width)
  const minimumWidths = columns.map(
    (column) => column.minWidth ?? Math.min(column.width, 8),
  )
  const overflow = totalTableWidth(widths) - availableWidth

  if (overflow <= 0) return widths

  let remainingOverflow = overflow
  const shrinkOrder = widths
    .map((width, index) => ({
      index,
      shrinkableWidth: width - minimumWidths[index],
    }))
    .sort((left, right) => right.shrinkableWidth - left.shrinkableWidth)

  for (const column of shrinkOrder) {
    if (remainingOverflow <= 0) break

    const nextWidth = Math.max(
      minimumWidths[column.index],
      widths[column.index] - remainingOverflow,
    )
    remainingOverflow -= widths[column.index] - nextWidth
    widths[column.index] = nextWidth
  }

  return widths
}

function totalTableWidth(widths: number[]): number {
  return widths.reduce((sum, width) => sum + width, 0) + widths.length * 3 + 1
}
