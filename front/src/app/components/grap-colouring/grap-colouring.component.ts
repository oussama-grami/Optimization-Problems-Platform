import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {
  GraphColoringService,
  GraphColoringResult,
} from '../../services/graph-coloring.service';
import {
  animate,
  keyframes,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
interface Node {
  id: number;
  x: number;
  y: number;
  color: number | null;
  dragging: boolean;
  // Animation properties
  scale: number;
  opacity: number;
}

interface Edge {
  source: number;
  target: number;
  // Animation properties
  progress: number;
  highlight: boolean;
}

@Component({
  selector: 'app-grap-colouring',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './grap-colouring.component.html',
  styleUrl: './grap-colouring.component.css',
  providers: [GraphColoringService],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        style({ opacity: 1 }),
        animate('300ms ease-out', style({ opacity: 0 })),
      ]),
    ]),
    trigger('slideAnimation', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate(
          '300ms ease-out',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        style({ transform: 'translateY(0)', opacity: 1 }),
        animate(
          '300ms ease-in',
          style({ transform: 'translateY(20px)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('bounceAnimation', [
      transition(':enter', [
        animate(
          '500ms',
          keyframes([
            style({ transform: 'scale(0)', offset: 0 }),
            style({ transform: 'scale(1.2)', offset: 0.5 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
    trigger('shakeAnimation', [
      transition(':enter', [
        animate(
          '800ms',
          keyframes([
            style({ transform: 'translateX(0)', offset: 0 }),
            style({ transform: 'translateX(-10px)', offset: 0.1 }),
            style({ transform: 'translateX(10px)', offset: 0.2 }),
            style({ transform: 'translateX(-10px)', offset: 0.3 }),
            style({ transform: 'translateX(10px)', offset: 0.4 }),
            style({ transform: 'translateX(-10px)', offset: 0.5 }),
            style({ transform: 'translateX(10px)', offset: 0.6 }),
            style({ transform: 'translateX(-10px)', offset: 0.7 }),
            style({ transform: 'translateX(10px)', offset: 0.8 }),
            style({ transform: 'translateX(-5px)', offset: 0.9 }),
            style({ transform: 'translateX(0)', offset: 1 }),
          ])
        ),
      ]),
    ]),
    trigger('cellAnimation', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out'),
      ]),
    ]),
  ],
})
export class GrapColouringComponent implements OnInit, AfterViewInit {
  @ViewChild('graphCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private scale: number = 1;
  private offset = { x: 0, y: 0 };
  private lastMousePosition = { x: 0, y: 0 };
  private isDraggingCanvas = false;
  private animationFrameId: number | null = null;

  // Theme
  isDarkTheme = false;

  // Graph data
  nodes: Node[] = [];
  edges: Edge[] = [];
  adjacencyMatrix: number[][] = [];

  // Operation modes
  mode: 'add' | 'delete' | 'connect' | 'move' = 'move';
  connecting: Node | null = null;

  // Colors for graph coloring - updated with more distinctive colors
  colorPalette: string[] = [
    '#FF3838', // Bright Red
    '#32CD32', // Lime Green
    '#1E90FF', // Dodger Blue
    '#FFD700', // Gold
    '#8A2BE2', // Blue Violet
    '#FF8C00', // Dark Orange
    '#00CED1', // Dark Turquoise
    '#FF1493', // Deep Pink
    '#006400', // Dark Green
    '#4B0082', // Indigo
    '#CD853F', // Peru
    '#800000', // Maroon
    '#008B8B', // Dark Cyan
    '#708090', // Slate Gray
    '#9932CC', // Dark Orchid
    '#2F4F4F', // Dark Slate Gray
  ];

  // Results
  chromaticNumber: number | null = null;
  isLoading = false;
  error: string | null = null;

  // UI
  showTips = true;

  // New properties to track hover states
  private hoveredNodeIndex: number | null = null;
  private hoveredEdge: { source: number; target: number } | null = null;

  constructor(private graphColoringService: GraphColoringService) {}

  ngOnInit(): void {
    // Load theme preference from localStorage
    this.isDarkTheme = localStorage.getItem('graphColoringTheme') === 'dark';

    // Initialize with a small example graph
    this.addNode(100, 100);
    this.addNode(200, 100);
    this.addNode(150, 200);

    // Add some edges with animation
    this.addEdgeWithAnimation(0, 1);
    setTimeout(() => this.addEdgeWithAnimation(1, 2), 300);
    setTimeout(() => this.addEdgeWithAnimation(2, 0), 600);

    // Update adjacency matrix
    this.updateAdjacencyMatrix();
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Set canvas size
    this.resizeCanvas();

    // Add event listener for window resize
    window.addEventListener('resize', this.resizeCanvas.bind(this));

    // Initialize canvas event listeners
    this.setupCanvasListeners();

    // Start animation loop
    this.startAnimationLoop();
  }

  ngOnDestroy(): void {
    // Stop animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Remove event listeners
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
  }

  @HostListener('window:beforeunload')
  saveThemePreference(): void {
    localStorage.setItem(
      'graphColoringTheme',
      this.isDarkTheme ? 'dark' : 'light'
    );
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;

    // Save theme preference
    localStorage.setItem(
      'graphColoringTheme',
      this.isDarkTheme ? 'dark' : 'light'
    );

    // Redraw the graph with new theme
    this.renderGraph();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;

    // Get the parent element's dimensions
    const parentWidth = canvas.parentElement!.clientWidth;
    const parentHeight = canvas.parentElement!.clientHeight || 600; // Default height if not specified

    // Set canvas size to match the parent's dimensions
    canvas.width = parentWidth;
    canvas.height = parentHeight;

    // Redraw the graph
    this.renderGraph();
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.renderGraph();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private setupCanvasListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    // Touch events for mobile
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), {
      passive: false,
    });
    canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), {
      passive: false,
    });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), {
      passive: false,
    });

    // Mouse events
    canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    canvas.addEventListener('wheel', this.handleWheel.bind(this), {
      passive: false,
    });
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale - this.offset.x;
      const y = (touch.clientY - rect.top) / this.scale - this.offset.y;

      // Handle as mouse down
      this.processPointerDown(x, y);
      this.lastMousePosition = { x: touch.clientX, y: touch.clientY };
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      const x = (touch.clientX - rect.left) / this.scale - this.offset.x;
      const y = (touch.clientY - rect.top) / this.scale - this.offset.y;

      // Handle as mouse move
      this.processPointerMove(x, y, touch.clientX, touch.clientY);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();

    // Handle as mouse up
    this.processPointerUp();
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale - this.offset.x;
    const y = (e.clientY - rect.top) / this.scale - this.offset.y;

    this.processPointerDown(x, y);
    this.lastMousePosition = { x: e.clientX, y: e.clientY };
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale - this.offset.x;
    const y = (e.clientY - rect.top) / this.scale - this.offset.y;

    // Update cursor style based on what the user is hovering over
    this.updateCursorStyle(x, y);

    // Process the pointer move (existing functionality)
    this.processPointerMove(x, y, e.clientX, e.clientY);
  }

  private handleMouseUp(): void {
    this.processPointerUp();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to world space before scaling
    const worldX = mouseX / this.scale - this.offset.x;
    const worldY = mouseY / this.scale - this.offset.y;

    // Apply zoom with smooth animation
    const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
    this.scale *= zoomFactor;

    // Limit scale
    this.scale = Math.min(Math.max(0.1, this.scale), 10);

    // Adjust offset to zoom towards mouse position
    this.offset.x = mouseX / this.scale - worldX;
    this.offset.y = mouseY / this.scale - worldY;
  }

  private processPointerDown(x: number, y: number): void {
    // Check if we're clicking on a node
    const clickedNodeIndex = this.findNodeAt(x, y);

    if (clickedNodeIndex !== null) {
      if (this.mode === 'add') {
        // Do nothing, we're in add mode
      } else if (this.mode === 'delete') {
        this.deleteNode(clickedNodeIndex);
      } else if (this.mode === 'connect') {
        if (this.connecting === null) {
          this.connecting = this.nodes[clickedNodeIndex];
        } else {
          // Create edge between connecting and clicked node
          if (this.connecting.id !== clickedNodeIndex) {
            this.addEdgeWithAnimation(this.connecting.id, clickedNodeIndex);
            this.updateAdjacencyMatrix();
          }
          this.connecting = null;
        }
      } else if (this.mode === 'move') {
        // Start dragging the node
        this.nodes[clickedNodeIndex].dragging = true;
      }
    } else {
      // Check if clicking on an edge
      const clickedEdge = this.findEdgeAt(x, y);

      if (clickedEdge !== null && this.mode === 'delete') {
        // If in delete mode and clicking on an edge, delete the edge
        this.deleteEdge(clickedEdge.source, clickedEdge.target);
      } else {
        // Not clicking on a node or edge
        if (this.mode === 'add') {
          this.addNodeWithAnimation(x, y);
          this.updateAdjacencyMatrix();
        } else if (this.mode === 'connect') {
          this.connecting = null;
        } else if (this.mode === 'move') {
          // Start dragging the canvas
          this.isDraggingCanvas = true;
        }
      }
    }
  }

  private processPointerMove(
    x: number,
    y: number,
    clientX: number,
    clientY: number
  ): void {
    // Check if we're dragging any node
    let isDraggingNode = false;
    for (const node of this.nodes) {
      if (node.dragging) {
        node.x = x;
        node.y = y;
        isDraggingNode = true;
        break;
      }
    }

    // If we're connecting, update the view
    if (this.connecting !== null) {
      // The line drawing happens in the renderGraph method
    }

    // If we're dragging the canvas (and not a node)
    if (this.isDraggingCanvas && !isDraggingNode) {
      const dx = clientX - this.lastMousePosition.x;
      const dy = clientY - this.lastMousePosition.y;
      this.offset.x += dx / this.scale;
      this.offset.y += dy / this.scale;
      this.lastMousePosition = { x: clientX, y: clientY };
    }
  }

  private processPointerUp(): void {
    // Stop dragging any nodes
    for (const node of this.nodes) {
      node.dragging = false;
    }
    this.isDraggingCanvas = false;
  }

  private findNodeAt(x: number, y: number): number | null {
    // Increased selection radius for better user interaction
    const nodeBaseRadius = 20;
    const selectionRadius = 30; // Larger hit area for easier selection

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const distance = Math.sqrt(
        Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
      );

      // Use the larger selection radius for finding nodes
      if (distance <= selectionRadius) {
        return i;
      }
    }
    return null;
  }

  // Find if a point is close to an edge
  private findEdgeAt(
    x: number,
    y: number
  ): { source: number; target: number } | null {
    const threshold = 8; // Distance threshold for edge detection

    for (const edge of this.edges) {
      if (edge.progress > 0.5) {
        // Only consider mostly-formed edges
        const source = this.nodes[edge.source];
        const target = this.nodes[edge.target];

        if (!source || !target) continue;

        // Calculate distance from point to line segment (edge)
        const distance = this.pointToLineDistance(
          x,
          y,
          source.x,
          source.y,
          target.x,
          target.y
        );

        // Check if click is within threshold distance of the edge
        if (distance <= threshold / this.scale) {
          return { source: edge.source, target: edge.target };
        }
      }
    }

    return null;
  }

  // Calculate distance from point to line segment
  private pointToLineDistance(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    // Calculate length of line segment
    const lineLength = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

    if (lineLength === 0)
      return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));

    // Calculate distance from point to line using vector projection
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) /
          (lineLength * lineLength)
      )
    );

    const projectionX = x1 + t * (x2 - x1);
    const projectionY = y1 + t * (y2 - y1);

    return Math.sqrt(
      (x - projectionX) * (x - projectionX) +
        (y - projectionY) * (y - projectionY)
    );
  }

  private updateCursorStyle(x: number, y: number): void {
    // Check if hovering over a node
    const nodeIndex = this.findNodeAt(x, y);
    const edge = this.findEdgeAt(x, y);

    // Update hover states
    this.hoveredNodeIndex = nodeIndex;
    this.hoveredEdge = edge;

    // Set cursor style based on what's being hovered and the current mode
    const canvas = this.canvasRef.nativeElement;

    if (nodeIndex !== null) {
      // Hovering over a node
      switch (this.mode) {
        case 'delete':
          canvas.style.cursor = 'no-drop';
          break;
        case 'connect':
          canvas.style.cursor = this.connecting ? 'crosshair' : 'pointer';
          break;
        case 'move':
          canvas.style.cursor = 'grab';
          break;
        default:
          canvas.style.cursor = 'pointer';
      }
    } else if (edge !== null) {
      // Hovering over an edge
      if (this.mode === 'delete') {
        canvas.style.cursor = 'no-drop';
      } else {
        canvas.style.cursor = 'pointer';
      }
    } else {
      // Not hovering over any selectable element
      switch (this.mode) {
        case 'add':
          canvas.style.cursor = 'cell';
          break;
        case 'delete':
          canvas.style.cursor = 'default';
          break;
        case 'connect':
          canvas.style.cursor = this.connecting ? 'crosshair' : 'default';
          break;
        case 'move':
          canvas.style.cursor = 'move';
          break;
        default:
          canvas.style.cursor = 'default';
      }
    }
  }

  addNodeWithAnimation(x: number, y: number): void {
    const id = this.nodes.length;
    this.nodes.push({
      id,
      x,
      y,
      color: null,
      dragging: false,
      scale: 0, // Start with zero scale for animation
      opacity: 0, // Start with zero opacity for animation
    });

    // Animate the node appearance
    const node = this.nodes[id];
    const animateNode = () => {
      if (node.scale < 1) {
        node.scale += 0.1;
        node.opacity += 0.1;

        if (node.scale > 1) {
          node.scale = 1;
          node.opacity = 1;
        } else {
          requestAnimationFrame(animateNode);
        }
      }
    };

    requestAnimationFrame(animateNode);

    // Update the adjacency matrix to include the new node
    this.expandAdjacencyMatrix();
  }

  addNode(x: number, y: number): void {
    const id = this.nodes.length;
    this.nodes.push({
      id,
      x,
      y,
      color: null,
      dragging: false,
      scale: 1,
      opacity: 1,
    });

    // Update the adjacency matrix to include the new node
    this.expandAdjacencyMatrix();
  }

  deleteNode(index: number): void {
    // Remove edges connected to this node
    this.edges = this.edges.filter(
      (edge) => edge.source !== index && edge.target !== index
    );

    // Remove the node with animation
    const node = this.nodes[index];

    // Animate the node disappearance
    const animateNodeRemoval = () => {
      if (node.scale > 0) {
        node.scale -= 0.1;
        node.opacity -= 0.1;

        if (node.scale <= 0) {
          // Remove the node after animation completes
          this.nodes.splice(index, 1);

          // Update node IDs
          for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].id = i;
          }

          // Update edges to reflect new node IDs
          for (const edge of this.edges) {
            if (edge.source > index) edge.source--;
            if (edge.target > index) edge.target--;
          }

          // Update adjacency matrix
          this.updateAdjacencyMatrix();
        } else {
          requestAnimationFrame(animateNodeRemoval);
        }
      }
    };

    requestAnimationFrame(animateNodeRemoval);
  }

  addEdgeWithAnimation(source: number, target: number): void {
    // Check if edge already exists
    if (
      !this.edges.some(
        (e) =>
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source)
      )
    ) {
      this.edges.push({
        source,
        target,
        progress: 0, // Start with zero progress for animation
        highlight: true, // Highlight the new edge initially
      });

      // Animate the edge appearance
      const edge = this.edges[this.edges.length - 1];
      const animateEdge = () => {
        if (edge.progress < 1) {
          edge.progress += 0.05;

          if (edge.progress >= 1) {
            edge.progress = 1;

            // Turn off highlight after a short delay
            setTimeout(() => {
              edge.highlight = false;
            }, 500);
          } else {
            requestAnimationFrame(animateEdge);
          }
        }
      };

      requestAnimationFrame(animateEdge);

      // Update adjacency matrix
      this.updateAdjacencyMatrix();
    }
  }

  addEdge(source: number, target: number): void {
    // Check if edge already exists
    if (
      !this.edges.some(
        (e) =>
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source)
      )
    ) {
      this.edges.push({
        source,
        target,
        progress: 1,
        highlight: false,
      });
    }
  }

  deleteEdge(source: number, target: number): void {
    // Find the edge to delete
    const edgeIndex = this.edges.findIndex(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source)
    );

    if (edgeIndex !== -1) {
      const edge = this.edges[edgeIndex];

      // Animate the edge disappearance
      const animateEdgeRemoval = () => {
        if (edge.progress > 0) {
          edge.progress -= 0.05;

          if (edge.progress <= 0) {
            // Remove the edge after animation completes
            this.edges.splice(edgeIndex, 1);

            // Update adjacency matrix
            this.updateAdjacencyMatrix();
          } else {
            requestAnimationFrame(animateEdgeRemoval);
          }
        }
      };

      // Highlight the edge before removal
      edge.highlight = true;

      requestAnimationFrame(animateEdgeRemoval);
    }
  }

  // Improved updateAdjacencyMatrix to ensure complete sync between graph and matrix
  updateAdjacencyMatrix(): void {
    const size = this.nodes.length;
    // Create a new matrix filled with zeros
    const newMatrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0));

    // Update based on current edges
    for (const edge of this.edges) {
      if (edge.source < size && edge.target < size) {
        // Ensure indices are valid
        // Only count fully formed edges (progress = 1) or at least halfway through animation
        if (edge.progress >= 0.5) {
          newMatrix[edge.source][edge.target] = 1;
          newMatrix[edge.target][edge.source] = 1; // Ensure symmetry
        }
      }
    }

    this.adjacencyMatrix = newMatrix;
  }

  // Fix matrix updates and synchronization with graph
  matrixValueChanged(i: number, j: number): void {
    // Ensure the value is either 0 or 1
    this.adjacencyMatrix[i][j] = this.adjacencyMatrix[i][j] === 0 ? 0 : 1;

    // Ensure matrix stays symmetric by updating both sides
    this.adjacencyMatrix[j][i] = this.adjacencyMatrix[i][j];

    // If the value changed to 1, add an edge
    if (this.adjacencyMatrix[i][j] === 1) {
      // Check if an edge already exists before adding
      const edgeExists = this.edges.some(
        edge => (edge.source === i && edge.target === j) || 
                (edge.source === j && edge.target === i)
      );
      
      if (!edgeExists) {
        this.addEdgeWithAnimation(i, j);
      }
    } else {
      // If the value changed to 0, remove the edge
      this.deleteEdge(i, j);
    }

    // Add visual feedback for the change
    this.addMatrixCellAnimation(i, j);
    this.addMatrixCellAnimation(j, i);
  }

  // Add animation to matrix cell for visual feedback
  private addMatrixCellAnimation(i: number, j: number): void {
    const tableRows = document.querySelectorAll('.adjacency-matrix tr');
    if (tableRows.length > i + 1) {
      // +1 because first row is headers
      const targetRow = tableRows[i + 1];
      const cells = targetRow.querySelectorAll('td');
      if (cells.length > j) {
        const cell = cells[j];
        cell.classList.add('matrix-updated');
        setTimeout(() => {
          cell.classList.remove('matrix-updated');
        }, 1000);
      }
    }
  }

  setMode(mode: 'add' | 'delete' | 'connect' | 'move'): void {
    this.mode = mode;
    this.connecting = null;
  }

  colorGraph(): void {
    this.isLoading = true;
    this.error = null;

    this.graphColoringService.colorGraph(this.adjacencyMatrix).subscribe({
      next: (result: GraphColoringResult) => {
        this.chromaticNumber = result.chromaticNumber;

        // Apply colors to nodes with animation
        this.animateColoring(result.coloredGraph);

        this.isLoading = false;
      },
      error: (error) => {
        this.error =
          'Error coloring graph: ' + (error.message || 'Unknown error');
        this.isLoading = false;
      },
    });
  }

  private animateColoring(coloredGraph: number[]): void {
    // Reset colors first
    for (const node of this.nodes) {
      node.color = null;
    }

    // Apply colors with delay for animation effect
    let delay = 0;
    const interval = 200; // ms between node colorings

    for (let i = 0; i < this.nodes.length; i++) {
      setTimeout(() => {
        // Find nodes that should get the same color
        const color = coloredGraph[i];
        const sameColorIndices = coloredGraph
          .map((c, idx) => (c === color ? idx : -1))
          .filter((idx) => idx !== -1);

        // Highlight the edges between same color nodes first (this would be an error)
        for (const edge of this.edges) {
          if (
            sameColorIndices.includes(edge.source) &&
            sameColorIndices.includes(edge.target)
          ) {
            edge.highlight = true;
            setTimeout(() => {
              edge.highlight = false;
            }, 1000);
          }
        }

        // Apply the color
        if (i < this.nodes.length) {
          this.nodes[i].color = coloredGraph[i];

          // Add scale animation to the node
          const node = this.nodes[i];
          const originalScale = node.scale;

          // Scale up
          const scaleUp = () => {
            node.scale += 0.05;
            if (node.scale >= originalScale * 1.3) {
              // Scale down
              const scaleDown = () => {
                node.scale -= 0.05;
                if (node.scale <= originalScale) {
                  node.scale = originalScale;
                } else {
                  requestAnimationFrame(scaleDown);
                }
              };
              requestAnimationFrame(scaleDown);
            } else {
              requestAnimationFrame(scaleUp);
            }
          };

          requestAnimationFrame(scaleUp);
        }
      }, delay);

      delay += interval;
    }
  }

  // Update the generateRandomGraph method to properly update the adjacency matrix
  generateRandomGraph(): void {
    // Clear current graph first
    this.resetGraph();

    // Add a small delay to ensure resetGraph animations are processed
    setTimeout(() => {
      // Generate random number of nodes (5-15)
      const numNodes = Math.floor(Math.random() * 6) + 5; // 5-10 nodes

      // Create nodes in a circle
      const radius = 150;
      const centerX = 300;
      const centerY = 300;

      // Create empty matrix with correct size
      const newMatrix = Array(numNodes)
        .fill(0)
        .map(() => Array(numNodes).fill(0));

      // Add nodes first to ensure IDs are consistent
      for (let i = 0; i < numNodes; i++) {
        const angle = (i / numNodes) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        // We use addNode instead of addNodeWithAnimation to ensure the graph is built all at once
        this.addNode(x, y);
      }

      // Generate random edges with probability 0.4
      for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
          if (Math.random() < 0.4) {
            // Add edge to graph
            this.addEdgeWithAnimation(i, j);

            // Update the matrix
            newMatrix[i][j] = 1;
            newMatrix[j][i] = 1; // Ensure symmetry
          }
        }
      }

      // Force update the adjacency matrix to ensure it matches the graph
      this.adjacencyMatrix = [...newMatrix];
    }, 600); // Wait for reset animation to complete
  }

  renderGraph(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = this.ctx;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    this.drawGrid();

    // Draw edges with enhanced selection zones
    for (const edge of this.edges) {
      if (edge.progress > 0) {
        const source = this.nodes[edge.source];
        const target = this.nodes[edge.target];

        if (!source || !target) continue;

        // Calculate the line's endpoints using the progress
        const startX = source.x * this.scale + this.offset.x;
        const startY = source.y * this.scale + this.offset.y;

        // For the animation, we draw only a portion of the line based on progress
        const endX = source.x + (target.x - source.x) * edge.progress;
        const endY = source.y + (target.y - source.y) * edge.progress;
        const scaledEndX = endX * this.scale + this.offset.x;
        const scaledEndY = endY * this.scale + this.offset.y;

        // Check if this edge is being hovered
        const isHovered =
          this.hoveredEdge !== null &&
          ((this.hoveredEdge.source === edge.source &&
            this.hoveredEdge.target === edge.target) ||
            (this.hoveredEdge.source === edge.target &&
              this.hoveredEdge.target === edge.source));

        // Draw invisible wider line for easier selection (selection zone)
        if (edge.progress >= 0.9) {
          // Only fully formed edges get selection zones
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(scaledEndX, scaledEndY);
          ctx.lineWidth = 12 * this.scale; // Wider invisible selection zone
          ctx.strokeStyle = 'rgba(0, 0, 0, 0)'; // Invisible stroke
          ctx.stroke();
        }

        // Draw the actual edge
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(scaledEndX, scaledEndY);

        if (edge.highlight) {
          ctx.strokeStyle = this.isDarkTheme ? '#FFD700' : '#FF6B6B';
          ctx.lineWidth = 3 * this.scale;
        } else if (isHovered) {
          // Highlight edge when hovered
          ctx.strokeStyle = this.isDarkTheme ? '#90CAF9' : '#4285F4';
          ctx.lineWidth = 3 * this.scale;
        } else {
          ctx.strokeStyle = this.isDarkTheme ? '#5a6270' : '#555555';
          ctx.lineWidth = 2 * this.scale;
        }

        ctx.stroke();
      }
    }

    // Draw connection line if connecting
    if (this.connecting) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = this.lastMousePosition.x - rect.left;
      const mouseY = this.lastMousePosition.y - rect.top;

      ctx.beginPath();
      ctx.moveTo(
        this.connecting.x * this.scale + this.offset.x,
        this.connecting.y * this.scale + this.offset.y
      );
      ctx.lineTo(mouseX, mouseY);
      ctx.strokeStyle = this.isDarkTheme ? '#FFD700' : '#FF6B6B';
      ctx.lineWidth = 2 * this.scale;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw nodes with enhanced selection zones
    for (const node of this.nodes) {
      if (node.opacity > 0) {
        const nodeRadius = 20 * this.scale * node.scale;
        const nodeX = node.x * this.scale + this.offset.x;
        const nodeY = node.y * this.scale + this.offset.y;

        // Check if this node is being hovered
        const isHovered = this.hoveredNodeIndex === node.id;

        // Draw invisible larger circle for easier selection (hit zone)
        if (node.scale > 0.5) {
          // Only visible nodes get selection zones
          ctx.beginPath();
          ctx.arc(
            nodeX,
            nodeY,
            nodeRadius + 10, // Larger invisible selection radius
            0,
            Math.PI * 2
          );
          ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Completely transparent
          ctx.fill();
        }

        // Draw the actual node
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);

        // Apply opacity
        const prevGlobalAlpha = ctx.globalAlpha;
        ctx.globalAlpha = node.opacity;

        // Fill with color if node is colored
        if (node.color !== null) {
          ctx.fillStyle =
            this.colorPalette[node.color % this.colorPalette.length];
        } else {
          ctx.fillStyle = this.isDarkTheme ? '#3a3f48' : '#ffffff';
        }

        ctx.fill();

        // Draw selection glow/indicator when hovered
        if (isHovered) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(nodeX, nodeY, nodeRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = this.isDarkTheme ? '#90CAF9' : '#4285F4';
          ctx.lineWidth = 3 * this.scale;
          ctx.stroke();
          ctx.restore();
        }

        // Improved node border visibility in light mode
        ctx.strokeStyle =
          node === this.connecting
            ? this.isDarkTheme
              ? '#FFD700'
              : '#ff0000'
            : this.isDarkTheme
            ? '#b9bbbe'
            : '#333333';
        ctx.lineWidth = this.isDarkTheme ? 2 * this.scale : 2.5 * this.scale;
        ctx.stroke();

        // Draw node label
        ctx.fillStyle = this.isDarkTheme ? '#eaeaea' : '#000000';
        ctx.font = `${14 * this.scale * node.scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id.toString(), nodeX, nodeY);

        // Restore global alpha
        ctx.globalAlpha = prevGlobalAlpha;
      }
    }

    // Draw mode text
    ctx.fillStyle = this.isDarkTheme
      ? 'rgba(255, 255, 255, 0.5)'
      : 'rgba(0, 0, 0, 0.7)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Zoom: ${this.scale.toFixed(2)}x`, 10, canvas.height - 10);

    // Display current mode
    const modeText = `Mode: ${
      this.mode.charAt(0).toUpperCase() + this.mode.slice(1)
    }`;
    ctx.fillText(modeText, 10, canvas.height - 30);
  }

  private drawGrid(): void {
    const canvas = this.canvasRef.nativeElement;
    const gridSize = 50 * this.scale;

    // Improved grid visibility in light mode
    this.ctx.strokeStyle = this.isDarkTheme ? '#2a2e36' : '#dddddd';
    this.ctx.lineWidth = 1;

    // Calculate grid starting positions
    const offsetX = this.offset.x % gridSize;
    const offsetY = this.offset.y % gridSize;

    // Draw vertical lines
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, canvas.height);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = offsetY; y < canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(canvas.width, y);
      this.ctx.stroke();
    }
  }

  resetView(): void {
    // Animate the reset
    const targetScale = 1;
    const targetOffset = { x: 0, y: 0 };
    const startScale = this.scale;
    const startOffset = { x: this.offset.x, y: this.offset.y };
    const duration = 500; // ms
    const startTime = performance.now();

    const animateReset = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      this.scale = startScale + (targetScale - startScale) * easedProgress;
      this.offset.x =
        startOffset.x + (targetOffset.x - startOffset.x) * easedProgress;
      this.offset.y =
        startOffset.y + (targetOffset.y - startOffset.y) * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animateReset);
      }
    };

    requestAnimationFrame(animateReset);
  }

  resetGraph(): void {
    // Animate node removal
    const nodesToRemove = [...this.nodes];
    let delay = 0;

    for (const node of nodesToRemove) {
      setTimeout(() => {
        const animateNodeRemoval = () => {
          if (node.scale > 0) {
            node.scale -= 0.1;
            node.opacity -= 0.1;

            if (node.scale <= 0) {
              const index = this.nodes.findIndex((n) => n.id === node.id);
              if (index !== -1) {
                this.nodes.splice(index, 1);
              }
            } else {
              requestAnimationFrame(animateNodeRemoval);
            }
          }
        };

        requestAnimationFrame(animateNodeRemoval);
      }, delay);

      delay += 50;
    }

    // Animate edge removal
    const edgesToRemove = [...this.edges];
    delay = 0;

    for (const edge of edgesToRemove) {
      setTimeout(() => {
        const animateEdgeRemoval = () => {
          if (edge.progress > 0) {
            edge.progress -= 0.1;

            if (edge.progress <= 0) {
              const index = this.edges.findIndex(
                (e) => e.source === edge.source && e.target === edge.target
              );
              if (index !== -1) {
                this.edges.splice(index, 1);
              }
            } else {
              requestAnimationFrame(animateEdgeRemoval);
            }
          }
        };

        edge.highlight = true;
        requestAnimationFrame(animateEdgeRemoval);
      }, delay);

      delay += 30;
    }

    // Clear other data
    setTimeout(() => {
      this.adjacencyMatrix = [];
      this.chromaticNumber = null;
    }, delay);
  }

  exportImage(): void {
    // Create a temporary canvas with higher resolution
    const tempCanvas = document.createElement('canvas');
    const scale = 2; // Higher resolution for better quality
    tempCanvas.width = this.canvasRef.nativeElement.width * scale;
    tempCanvas.height = this.canvasRef.nativeElement.height * scale;

    const tempCtx = tempCanvas.getContext('2d')!;

    // Save current state
    const currentScale = this.scale;
    const currentOffset = { ...this.offset };

    // Adjust scale and offset for export
    this.scale *= scale;
    this.offset.x *= scale;
    this.offset.y *= scale;

    // Fill background to match the current theme
    tempCtx.fillStyle = this.isDarkTheme ? '#282c34' : '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Swap canvas context temporarily
    const originalCtx = this.ctx;
    this.ctx = tempCtx;

    // Render grid first (ensures grid appears in the export)
    this.drawGrid();

    // Render graph to temp canvas
    this.renderGraph();

    // Add a title
    tempCtx.fillStyle = this.isDarkTheme ? '#eaeaea' : '#2c3e50';
    tempCtx.font = '40px Arial';
    tempCtx.textAlign = 'center';
    tempCtx.fillText(
      `Graph Coloring ${
        this.chromaticNumber
          ? `- Chromatic Number: ${this.chromaticNumber}`
          : ''
      }`,
      tempCanvas.width / 2,
      50
    );

    // Restore original context and state
    this.ctx = originalCtx;
    this.scale = currentScale;
    this.offset = currentOffset;

    // Convert to image and trigger download
    const image = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'graph-coloring.png';

    // Add animation effect
    this.flashScreen('Exporting Image...');

    setTimeout(() => {
      link.click();
    }, 500);
  }

  exportMatrix(): void {
    const jsonStr = JSON.stringify(this.adjacencyMatrix, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'adjacency_matrix.json';

    // Add animation effect
    this.flashScreen('Exporting Matrix...');

    setTimeout(() => {
      link.click();
      URL.revokeObjectURL(url);
    }, 500);
  }

  private flashScreen(message: string): void {
    // Create overlay div
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = this.isDarkTheme
      ? 'rgba(0, 0, 0, 0.7)'
      : 'rgba(255, 255, 255, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.transition = 'opacity 0.5s';

    // Add message
    const messageDiv = document.createElement('div');
    messageDiv.style.padding = '20px 40px';
    messageDiv.style.backgroundColor = this.isDarkTheme ? '#3a3f48' : '#ffffff';
    messageDiv.style.borderRadius = '8px';
    messageDiv.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    messageDiv.style.color = this.isDarkTheme ? '#eaeaea' : '#2c3e50';
    messageDiv.style.fontSize = '18px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.textContent = message;

    overlay.appendChild(messageDiv);
    document.body.appendChild(overlay);

    // Remove after animation
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 500);
    }, 1000);
  }

  // Override the importMatrix method to ensure proper synchronization
  importMatrix(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const matrix = JSON.parse(content);

        // Validate the matrix
        if (
          Array.isArray(matrix) &&
          matrix.every((row) => Array.isArray(row))
        ) {
          // Ensure matrix is square
          const numNodes = matrix.length;
          const isSquare = matrix.every((row) => row.length === numNodes);

          if (!isSquare) {
            this.error =
              'Matrix must be square (same number of rows and columns)';
            return;
          }

          // Ensure matrix is symmetric
          const isSymmetric = matrix.every((row, i) =>
            row.every((value, j) => value === matrix[j][i])
          );

          if (!isSymmetric) {
            // Fix symmetry by making a symmetric copy
            for (let i = 0; i < numNodes; i++) {
              for (let j = 0; j < i; j++) {
                // Use OR operation to ensure connectivity is preserved
                const value = matrix[i][j] === 1 || matrix[j][i] === 1 ? 1 : 0;
                matrix[i][j] = value;
                matrix[j][i] = value;
              }
            }
          }

          // Clear existing graph with animation
          this.resetGraph();

          // Wait for reset animation to complete
          setTimeout(() => {
            // Create nodes in a circle layout
            const radius = 150;
            const centerX = 300;
            const centerY = 300;

            // Create all nodes first
            for (let i = 0; i < numNodes; i++) {
              const angle = (i / numNodes) * 2 * Math.PI;
              const x = centerX + radius * Math.cos(angle);
              const y = centerY + radius * Math.sin(angle);
              this.addNode(x, y);
            }

            // Add edges based on the matrix
            for (let i = 0; i < numNodes; i++) {
              for (let j = i + 1; j < numNodes; j++) {
                if (matrix[i][j] === 1) {
                  this.addEdgeWithAnimation(i, j);
                }
              }
            }

            // Set the adjacency matrix directly to ensure consistency
            this.adjacencyMatrix = matrix;
          }, 500);
        } else {
          this.error = 'Invalid adjacency matrix format';
        }
      } catch (err) {
        this.error =
          'Failed to parse file: ' +
          (err instanceof Error ? err.message : String(err));
      }

      // Reset input value so the same file can be imported again
      input.value = '';
    };

    reader.readAsText(file);
  }

  // Helper method to expand the adjacency matrix when a new node is added
  expandAdjacencyMatrix(): void {
    const currentSize = this.adjacencyMatrix.length;
    const newSize = this.nodes.length;

    // If the matrix needs to be expanded
    if (newSize > currentSize) {
      // Add new rows
      for (let i = currentSize; i < newSize; i++) {
        // Add a new row filled with zeros
        this.adjacencyMatrix.push(Array(currentSize).fill(0));
      }

      // Add new columns to each existing row
      for (let i = 0; i < newSize; i++) {
        for (let j = currentSize; j < newSize; j++) {
          if (i === j) {
            // Add zeros on the diagonal
            this.adjacencyMatrix[i][j] = 0;
          } else if (i < currentSize) {
            // Extend existing rows
            this.adjacencyMatrix[i].push(0);
          }
        }
      }
    }
  }
}
