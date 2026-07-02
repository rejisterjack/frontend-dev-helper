import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ElementInfo {
  tagName: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  accessibility: {
    role: string | null;
    ariaAttributes: Record<string, string>;
    tabIndex: string | null;
    accessibleName: string | null;
  };
  boxModel: {
    width: number;
    height: number;
    margin: string;
    padding: string;
  };
  textContent: string | null;
}

// Uses the Chrome DevTools inspectedWindow API to read the currently selected element.
// This is the standard API for DevTools extensions -- it evaluates JS in the inspected page.
const INSPECT_ELEMENT_SCRIPT = `(function() {
  const el = $0;
  if (!el) return null;
  const cs = window.getComputedStyle(el);
  return JSON.stringify({
    tagName: el.tagName.toLowerCase(),
    id: el.id,
    classes: Array.from(el.classList),
    attributes: Array.from(el.attributes).reduce((acc, a) => { acc[a.name] = a.value; return acc; }, {}),
    computedStyles: {
      display: cs.display,
      position: cs.position,
      width: cs.width,
      height: cs.height,
      margin: cs.margin,
      padding: cs.padding,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      opacity: cs.opacity,
      overflow: cs.overflow,
      zIndex: cs.zIndex,
      borderRadius: cs.borderRadius,
      border: cs.border,
    },
    accessibility: {
      role: el.getAttribute('role'),
      ariaAttributes: Array.from(el.attributes)
        .filter(a => a.name.startsWith('aria-'))
        .reduce((acc, a) => { acc[a.name] = a.value; return acc; }, {}),
      tabIndex: el.getAttribute('tabindex'),
      accessibleName: el.getAttribute('aria-label') || el.getAttribute('title') || null,
    },
    boxModel: {
      width: el.offsetWidth,
      height: el.offsetHeight,
      margin: cs.margin,
      padding: cs.padding,
    },
    textContent: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
      ? el.textContent?.trim().slice(0, 200) || null
      : null,
  });
})()`;

function getElementInfo(): Promise<ElementInfo | null> {
  return new Promise((resolve) => {
    browser.devtools.inspectedWindow.eval(
      INSPECT_ELEMENT_SCRIPT,
      (result, isException) => {
        if (isException || !result) {
          resolve(null);
        } else {
          try {
            resolve(JSON.parse(result as unknown as string));
          } catch {
            resolve(null);
          }
        }
      },
    );
  });
}

function PropertyInfo({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground truncate ml-2 max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}

function PaneContent() {
  const [info, setInfo] = useState<ElementInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    getElementInfo().then((data) => {
      setInfo(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !info) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Select an element to inspect
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs">
            {info.tagName}
          </Badge>
          {info.id && (
            <Badge variant="secondary" className="text-xs">
              #{info.id}
            </Badge>
          )}
        </div>

        {info.classes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {info.classes.map((cls) => (
              <Badge
                key={cls}
                variant="secondary"
                className="text-[0.6rem] px-1 py-0"
              >
                .{cls}
              </Badge>
            ))}
          </div>
        )}

        {info.textContent && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground italic truncate">
              {info.textContent}
            </div>
          </>
        )}

        <Separator />
        <div className="text-xs font-semibold text-foreground">Box Model</div>
        <PropertyInfo label="Width" value={`${info.boxModel.width}px`} />
        <PropertyInfo label="Height" value={`${info.boxModel.height}px`} />
        <PropertyInfo label="Margin" value={info.boxModel.margin} />
        <PropertyInfo label="Padding" value={info.boxModel.padding} />

        <Separator />
        <div className="text-xs font-semibold text-foreground">Styles</div>
        {Object.entries(info.computedStyles).map(([key, value]) => (
          <PropertyInfo key={key} label={key} value={value} />
        ))}

        <Separator />
        <div className="text-xs font-semibold text-foreground">
          Accessibility
        </div>
        <PropertyInfo label="Role" value={info.accessibility.role} />
        <PropertyInfo label="Name" value={info.accessibility.accessibleName} />
        <PropertyInfo label="tabIndex" value={info.accessibility.tabIndex} />
        {Object.entries(info.accessibility.ariaAttributes).map(
          ([key, value]) => (
            <PropertyInfo key={key} label={key} value={value} />
          ),
        )}
      </div>
    </ScrollArea>
  );
}

document.documentElement.classList.add("dark");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PaneContent />
  </React.StrictMode>,
);
