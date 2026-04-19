"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatBytes, formatBucketName } from "@/lib/file-utils";
import { useAppStore } from "@/stores/app-store";
import type { SortField } from "@/types";
import { ArrowDown, ArrowUp, Check, ChevronDown } from "lucide-react";
import { Database } from "@phosphor-icons/react";
import { useParams } from "next/navigation";
import { Fragment, useState } from "react";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "kind", label: "Kind" },
  { value: "size", label: "Size" },
  { value: "date", label: "Date" },
];

function SortDropdown() {
  const { sortField, sortDirection, setSortField } = useAppStore();
  const [open, setOpen] = useState(false);
  const label = SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? "Name";
  const DirIcon = sortDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex items-center gap-0.5 text-[14px] text-accent-blue hover:underline shrink-0 outline-none">
        by {label}
        <DirIcon className="h-3 w-3" strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4}>
        <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
          Sort by
        </p>
        {SORT_OPTIONS.map((option) => {
          const isActive = sortField === option.value;
          return (
            <button
              key={option.value}
              onClick={() => {
                setSortField(option.value);
                if (!isActive) setOpen(false);
              }}
              className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
              {option.label}
              {isActive && (
                <Check className="absolute right-2 h-4 w-4 text-accent-blue" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

interface BreadcrumbNavProps {
  itemCount?: number;
  selectedCount?: number;
  totalSize?: number;
  isSearching?: boolean;
}

export function BreadcrumbNav({ itemCount, selectedCount, totalSize, isSearching }: BreadcrumbNavProps) {
  const params = useParams();
  const bucket = params.bucket as string | undefined;
  const pathSegments = (params.path as string[] | undefined) ?? [];

  if (!bucket) return null;

  const currentName =
    pathSegments.length > 0
      ? decodeURIComponent(pathSegments[pathSegments.length - 1])
      : formatBucketName(bucket);

  const statusText =
    selectedCount && selectedCount > 0 && itemCount
      ? `${selectedCount} of ${itemCount} selected`
      : itemCount !== undefined
        ? isSearching
          ? `${itemCount} results`
          : `${itemCount} items${totalSize !== undefined && totalSize > 0 ? `, ${formatBytes(totalSize)}` : ""}`
        : "";

  return (
    <div className="flex flex-col gap-1 px-6 pb-3 pt-5">
      {/* Breadcrumb path — only show when navigated deeper than bucket root */}
      {pathSegments.length > 0 && (
        <Breadcrumb className="mb-1">
          <BreadcrumbList className="text-[12px] text-text-secondary">
            <BreadcrumbItem>
              <BreadcrumbLink
                href={`/${bucket}`}
                className="text-text-secondary hover:text-accent-blue"
              >
                {formatBucketName(bucket)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathSegments.slice(0, -1).map((segment, index) => {
              const href = `/${bucket}/${pathSegments.slice(0, index + 1).join("/")}`;
              return (
                <Fragment key={href}>
                  <BreadcrumbSeparator className="text-text-quaternary" />
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={href}
                      className="text-text-secondary hover:text-accent-blue"
                    >
                      {decodeURIComponent(segment)}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Title row with sort indicator */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2.5">
          <Database className="shrink-0" size={24} weight="fill" color="var(--accent-blue)" />
          <h1 className="text-[24px] font-medium leading-tight text-text-primary">
            {currentName}
          </h1>
        </div>
        <SortDropdown />
      </div>

      {/* Status line */}
      {statusText && (
        <p className="text-[13px] mt-0.5 text-text-secondary">
          {statusText}
        </p>
      )}
    </div>
  );
}
