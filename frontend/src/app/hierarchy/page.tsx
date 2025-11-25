'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useReactToPrint } from 'react-to-print';
import { getRoleDisplayName } from '@/lib/roles';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  role: string;
  position: string | null;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  directReports?: Employee[];
}

interface TreeNode extends Employee {
  children: TreeNode[];
}

interface LayoutInfo {
  x: number; // Center X position of the node
  y: number; // Top Y position of the node
  subtreeLeft: number; // Leftmost X of subtree
  subtreeRight: number; // Rightmost X of subtree
}

// Tidy-tree layout algorithm (Reingold-Tilford style)
// Moved outside component to be stable for useMemo
function calculateTidyLayout(roots: TreeNode[]): Map<string, LayoutInfo> {
  const layoutMap = new Map<string, LayoutInfo>();
  const CARD_WIDTH = 160;
  const HORIZONTAL_GAP = 24; // Space between siblings
  const VERTICAL_GAP = 180; // Space between levels

  // Calculate subtree width recursively
  const getSubtreeWidth = (node: TreeNode): number => {
    if (node.children.length === 0) {
      return CARD_WIDTH;
    }
    let width = 0;
    node.children.forEach((child, idx) => {
      width += getSubtreeWidth(child);
      if (idx < node.children.length - 1) {
        width += HORIZONTAL_GAP;
      }
    });
    return Math.max(CARD_WIDTH, width);
  };

  // Position nodes recursively
  let nextX = 0;
  
  const positionNode = (node: TreeNode, level: number): number => {
    let nodeX: number;
    
    if (node.children.length === 0) {
      // Leaf node: place at current position
      nodeX = nextX + CARD_WIDTH / 2;
      nextX += CARD_WIDTH + HORIZONTAL_GAP;
      
      layoutMap.set(node.id, {
        x: nodeX,
        y: level * VERTICAL_GAP,
        subtreeLeft: nodeX - CARD_WIDTH / 2,
        subtreeRight: nodeX + CARD_WIDTH / 2
      });
    } else {
      // Internal node: position children first, then center parent over them
      const childrenX: number[] = [];
      const startX = nextX;
      
      node.children.forEach(child => {
        const childX = positionNode(child, level + 1);
        childrenX.push(childX);
      });
      
      // Center parent over children
      const firstChildX = childrenX[0];
      const lastChildX = childrenX[childrenX.length - 1];
      nodeX = (firstChildX + lastChildX) / 2;
      
      // Ensure parent is at least CARD_WIDTH/2 from left edge
      const subtreeLeft = Math.min(firstChildX - CARD_WIDTH / 2, nodeX - CARD_WIDTH / 2);
      const subtreeRight = Math.max(lastChildX + CARD_WIDTH / 2, nodeX + CARD_WIDTH / 2);
      
      layoutMap.set(node.id, {
        x: nodeX,
        y: level * VERTICAL_GAP,
        subtreeLeft,
        subtreeRight
      });
    }
    
    return nodeX;
  };

  // Position all root trees
  let rootOffset = 0;
  roots.forEach((root, rootIdx) => {
    const oldNextX = nextX;
    nextX = 0;
    
    positionNode(root, 0);
    
    // Apply offset to this root's subtree
    const subtreeWidth = nextX - (rootIdx > 0 ? HORIZONTAL_GAP : 0);
    const applyOffset = (node: TreeNode) => {
      const layout = layoutMap.get(node.id)!;
      layoutMap.set(node.id, {
        x: layout.x + rootOffset,
        y: layout.y,
        subtreeLeft: layout.subtreeLeft + rootOffset,
        subtreeRight: layout.subtreeRight + rootOffset
      });
      node.children.forEach(applyOffset);
    };
    
    applyOffset(root);
    rootOffset += subtreeWidth + (rootIdx < roots.length - 1 ? HORIZONTAL_GAP * 2 : 0);
  });

  // Normalize positions (shift so minimum X is at padding)
  let minX = Infinity;
  layoutMap.forEach(layout => {
    minX = Math.min(minX, layout.subtreeLeft);
  });

  const padding = 40;
  const normalizedLayout = new Map<string, LayoutInfo>();
  layoutMap.forEach((layout, id) => {
    normalizedLayout.set(id, {
      x: layout.x - minX + padding,
      y: layout.y + padding,
      subtreeLeft: layout.subtreeLeft - minX + padding,
      subtreeRight: layout.subtreeRight - minX + padding
    });
  });

  return normalizedLayout;
}

export default function HierarchyPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [layout, setLayout] = useState<Map<string, LayoutInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState<number>(0);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        const hierarchyTree = buildTree(data);
        setTree(hierarchyTree);
      } else {
        setError('Error al cargar la jerarquía');
      }
    } catch (err) {
      setError('Error al cargar la jerarquía');
    } finally {
      setLoading(false);
    }
  };

  // Calculate layout when tree changes
  const calculatedLayout = useMemo(() => {
    if (tree.length > 0) {
      return calculateTidyLayout(tree);
    }
    return new Map<string, LayoutInfo>();
  }, [tree]);

  // Calculate chart width from layout
  const chartWidth = useMemo(() => {
    if (layout.size === 0) return 0;
    const CARD_WIDTH = 160;
    let maxX = 0;
    layout.forEach(l => {
      maxX = Math.max(maxX, l.x + CARD_WIDTH / 2);
    });
    return maxX + 40;
  }, [layout]);

  // Calculate scale factor
  const scale = useMemo(() => {
    if (availableWidth === 0 || chartWidth === 0) return 1;
    if (chartWidth > availableWidth) {
      return availableWidth / chartWidth;
    }
    return 1;
  }, [availableWidth, chartWidth]);

  useEffect(() => {
    if (calculatedLayout.size > 0) {
      setLayout(calculatedLayout);
    }
  }, [calculatedLayout]);

  // Measure available container width and update on resize
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setAvailableWidth(containerRef.current.clientWidth);
      }
    };

    // Initial measurement - use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      updateWidth();
    });

    // Set up ResizeObserver to track container width changes
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setAvailableWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    // Also listen to window resize as fallback
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []); // Empty deps - ResizeObserver handles all size changes automatically

  // Re-measure width when layout changes (to handle container remounts)
  useEffect(() => {
    if (!containerRef.current || layout.size === 0) return;
    
    // Small delay to ensure container has re-rendered
    const timeoutId = setTimeout(() => {
      if (containerRef.current) {
        setAvailableWidth(containerRef.current.clientWidth);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [layout.size]); // Only trigger when layout.size changes

  const buildTree = (employees: Employee[]): TreeNode[] => {
    const employeeMap = new Map<string, TreeNode>();
    
    employees.forEach(emp => {
      employeeMap.set(emp.id, {
        ...emp,
        children: []
      });
    });

    const roots: TreeNode[] = [];
    
    employees.forEach(emp => {
      const node = employeeMap.get(emp.id)!;
      
      if (emp.reportsToId) {
        const parent = employeeMap.get(emp.reportsToId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };


  // Render employee card
  const renderEmployeeCard = (node: TreeNode) => {
    const isRoot = !node.reportsToId;
    
    return (
      <div
        className={`
          relative p-2.5 rounded-md border-2 shadow-sm transition-all hover:shadow-md 
          print:shadow-none print:border-gray-400 print:border-[1.5px]
          ${isRoot ? 'bg-indigo-50 border-indigo-300 print:bg-gray-50' : 'bg-white border-gray-200'}
          w-[160px]
        `}
      >
        <div className="flex flex-col items-center text-center">
          <div className="font-semibold text-gray-900 text-sm leading-tight">
            {node.name || 'Sin nombre'}
          </div>
          <div className="text-xs text-gray-600 mt-0.5 leading-tight">
            {node.position || 'Sin cargo'}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 truncate w-full leading-tight">
            {node.email}
          </div>
          <div className="mt-1.5">
            <span className={`
              inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
              ${node.role === 'Admin' ? 'bg-purple-100 text-purple-800 print:bg-purple-50 print:text-purple-900' : ''}
              ${node.role === 'HR_Staff' ? 'bg-blue-100 text-blue-800 print:bg-blue-50 print:text-blue-900' : ''}
              ${node.role === 'Management' ? 'bg-green-100 text-green-800 print:bg-green-50 print:text-green-900' : ''}
              ${node.role === 'employee' ? 'bg-gray-100 text-gray-800 print:bg-gray-50 print:text-gray-900' : ''}
            `}>
              {getRoleDisplayName(node.role)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Build parent-child map
  const buildParentMap = (roots: TreeNode[]): Map<string, TreeNode> => {
    const parentMap = new Map<string, TreeNode>();
    
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        node.children.forEach(child => {
          parentMap.set(child.id, node);
        });
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(roots);
    return parentMap;
  };

  // Group nodes by level
  const groupNodesByLevel = (roots: TreeNode[]): Map<number, TreeNode[]> => {
    const nodesByLevel = new Map<number, TreeNode[]>();
    
    const traverse = (nodes: TreeNode[], level: number) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      
      nodes.forEach(node => {
        nodesByLevel.get(level)!.push(node);
        if (node.children.length > 0) {
          traverse(node.children, level + 1);
        }
      });
    };
    
    traverse(roots, 0);
    return nodesByLevel;
  };

  // Render organizational chart
  const renderOrgChart = () => {
    if (tree.length === 0 || layout.size === 0) {
      return null;
    }

    const nodesByLevel = groupNodesByLevel(tree);
    const parentMap = buildParentMap(tree);
    const CARD_WIDTH = 160;
    const CARD_HEIGHT = 100;
    const CONNECTOR_HEIGHT = 35;

    // Calculate container dimensions
    let maxX = 0;
    let maxY = 0;
    layout.forEach(l => {
      maxX = Math.max(maxX, l.x + CARD_WIDTH / 2);
      maxY = Math.max(maxY, l.y + CARD_HEIGHT);
    });

    const levels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

    return (
      <div 
        className="org-chart-wrapper relative"
        style={{
          width: `${maxX + 40}px`,
          minHeight: `${maxY + 40}px`
        }}
      >
        {/* SVG for connector lines */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: `${maxX + 40}px`,
            height: `${maxY + 40}px`
          }}
        >
          {levels.map(level => {
            if (level === 0) return null;
            
            return nodesByLevel.get(level)?.map(node => {
              const nodeLayout = layout.get(node.id);
              const parent = parentMap.get(node.id);
              if (!nodeLayout || !parent) return null;

              const parentLayout = layout.get(parent.id);
              if (!parentLayout) return null;

              const parentX = parentLayout.x;
              const nodeX = nodeLayout.x;
              const parentY = parentLayout.y + CARD_HEIGHT;
              const nodeY = nodeLayout.y;
              const siblings = parent.children;

              // Render connectors
              if (siblings.length === 1) {
                // Single child: straight vertical line
                return (
                  <line
                    key={`connector-${node.id}`}
                    x1={parentX}
                    y1={parentY}
                    x2={parentX}
                    y2={nodeY}
                    stroke="#6b7280"
                    strokeWidth="2"
                    className="print:stroke-gray-700"
                  />
                );
              } else {
                // Multiple children: T-shaped connector
                const firstChildX = layout.get(siblings[0].id)?.x ?? 0;
                const lastChildX = layout.get(siblings[siblings.length - 1].id)?.x ?? 0;
                const horizontalY = nodeY - CONNECTOR_HEIGHT / 2;

                // Only render once per parent
                if (node === siblings[0]) {
                  return (
                    <g key={`connector-group-${parent.id}`}>
                      {/* Vertical line from parent down to horizontal line */}
                      <line
                        x1={parentX}
                        y1={parentY}
                        x2={parentX}
                        y2={horizontalY}
                        stroke="#6b7280"
                        strokeWidth="2"
                        className="print:stroke-gray-700"
                      />
                      {/* Horizontal line connecting all children */}
                      <line
                        x1={firstChildX}
                        y1={horizontalY}
                        x2={lastChildX}
                        y2={horizontalY}
                        stroke="#6b7280"
                        strokeWidth="2"
                        className="print:stroke-gray-700"
                      />
                      {/* Vertical lines from horizontal line to each child */}
                      {siblings.map(sibling => {
                        const siblingX = layout.get(sibling.id)?.x ?? 0;
                        return (
                          <line
                            key={`child-line-${sibling.id}`}
                            x1={siblingX}
                            y1={horizontalY}
                            x2={siblingX}
                            y2={nodeY}
                            stroke="#6b7280"
                            strokeWidth="2"
                            className="print:stroke-gray-700"
                          />
                        );
                      })}
                    </g>
                  );
                }
                return null;
              }
            });
          })}
        </svg>

        {/* Render employee cards */}
        {levels.map(level => {
          return nodesByLevel.get(level)?.map(node => {
            const nodeLayout = layout.get(node.id);
            if (!nodeLayout) return null;

            return (
              <div
                key={node.id}
                className="absolute z-10"
                style={{
                  left: `${nodeLayout.x - CARD_WIDTH / 2}px`,
                  top: `${nodeLayout.y}px`
                }}
              >
                {renderEmployeeCard(node)}
              </div>
            );
          });
        })}
      </div>
    );
  };

  // PDF export handler
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Jerarquía Organizacional',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando jerarquía...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .org-chart-wrapper {
            page-break-inside: avoid;
          }
          /* Disable scaling for print/PDF export */
          .chart-scale-container {
            transform: none !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50 print:bg-white">
        <div className="w-full mx-auto py-4 sm:px-6 lg:px-8 print:py-0 print:px-0">
          <div className="px-4 py-4 sm:px-0 print:px-0 print:py-0">
            <div className="mb-4 flex justify-between items-center print:hidden">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Jerarquía Organizacional</h1>
                <p className="mt-1 text-xs text-gray-600">
                  Estructura de mando y cadena de reportes
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  📄 Descargar PDF
                </button>
                <Link
                  href="/employees"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ← Volver
                </Link>
              </div>
            </div>

            {/* Print header */}
            <div className="hidden print:block mb-4 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Jerarquía Organizacional</h1>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded print:hidden">
                {error}
              </div>
            )}

            {tree.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center print:shadow-none print:p-4">
                <p className="text-gray-500">No hay jerarquía definida aún.</p>
                <p className="text-sm text-gray-400 mt-2 print:hidden">
                  Asigna managers a los empleados para ver la estructura organizacional.
                </p>
              </div>
            ) : (
              <div 
                ref={printRef}
                className="bg-white shadow rounded-lg p-8 print:shadow-none print:p-4 print:bg-transparent"
              >
                <div 
                  ref={containerRef}
                  className="py-4 print:py-2 overflow-hidden print:overflow-visible"
                  style={{ width: '100%' }}
                >
                  {/* Outer scaling container: width 100%, overflow hidden, center content */}
                  <div 
                    className="flex justify-center print:block"
                    style={{ width: '100%', overflow: 'hidden' }}
                  >
                    {/* Inner scaling container: transform scale, transformOrigin top center, width fit-content */}
                    <div
                      className="chart-scale-container"
                      style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        width: 'fit-content'
                      }}
                    >
                      {renderOrgChart()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
