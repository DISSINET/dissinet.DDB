import { Button, Loader } from "components";
import React, { ReactNode } from "react";
import { Column, usePagination, useSortBy, useTable } from "react-table";
import {
  StyledHeading,
  StyledPageNumber,
  StyledPagination,
  StyledTable,
  StyledTableContainer,
  StyledTableHeader,
  StyledTd,
  StyledTh,
  StyledTHead,
  StyledTr,
  StyledUsedInTitle,
} from "./TableStyles";

interface Table {
  data: any[];
  columns: Column<any>[];
  isLoading?: boolean;
  entityTitle?: { singular: string; plural: string };
  perPage?: number;
  disablePaging?: boolean;
}

export const Table: React.FC<Table> = ({
  data,
  columns,
  isLoading,
  entityTitle = { singular: "Record", plural: "Records" },
  perPage = 5,
  disablePaging,
}) => {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: perPage,
        hiddenColumns: [],
      },
    },
    useSortBy,
    usePagination
  );

  const getPagination = (position: "top" | "bottom"): ReactNode => (
    <StyledTableHeader
      position={position}
      pagingUseless={pageSize > data.length}
    >
      {position === "top" && (
        <StyledHeading>
          {
            <StyledUsedInTitle>
              <b>{`${data.length} `}</b>{" "}
              {`${
                data.length === 1 ? entityTitle.singular : entityTitle.plural
              }`}
            </StyledUsedInTitle>
          }
        </StyledHeading>
      )}
      {pageSize < data.length && (
        <StyledPagination>
          <Button
            onClick={(): void => gotoPage(0)}
            disabled={!canPreviousPage}
            label={"<<"}
            inverted
            color="success"
          />

          <Button
            onClick={(): void => previousPage()}
            disabled={!canPreviousPage}
            label={"<"}
            inverted
            color="success"
          />

          <StyledPageNumber>
            <strong>
              {pageIndex + 1} / {pageOptions.length}
            </strong>
          </StyledPageNumber>

          <Button
            onClick={(): void => nextPage()}
            disabled={!canNextPage}
            label={">"}
            inverted
            color="success"
          />

          <Button
            onClick={(): void => gotoPage(pageCount - 1)}
            disabled={!canNextPage}
            label={">>"}
            inverted
            color="success"
          />
        </StyledPagination>
      )}
    </StyledTableHeader>
  );

  return (
    <>
      {!disablePaging && getPagination("top")}
      <StyledTableContainer>
        <StyledTable
          {...getTableProps()}
          className="table table-rounded is-striped is-hoverable is-fullwidth"
        >
          <StyledTHead>
            {headerGroups.map((headerGroup, key) => (
              <tr {...headerGroup.getHeaderGroupProps()} key={key}>
                {headerGroup.headers.map((column, key) => (
                  <StyledTh
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    key={key}
                  >
                    {column.render("Header")}
                    {/* Add a sort direction indicator */}
                    <span>
                      {column.isSorted
                        ? column.isSortedDesc
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </span>
                  </StyledTh>
                ))}
              </tr>
            ))}
          </StyledTHead>
          <tbody {...getTableBodyProps()}>
            {page.map((row, key) => {
              prepareRow(row);
              return (
                <StyledTr {...row.getRowProps()} key={key}>
                  {row.cells.map((cell, key) => {
                    return (
                      <StyledTd {...cell.getCellProps()} key={key}>
                        {cell.render("Cell")}
                      </StyledTd>
                    );
                  })}
                </StyledTr>
              );
            })}
          </tbody>
          <tfoot></tfoot>
        </StyledTable>
        {data.length < 1 && !isLoading && "No records found"}
        {/* {"Server error"} */}
        <Loader show={isLoading} />
        {!disablePaging && getPagination("bottom")}
      </StyledTableContainer>
    </>
  );
};
