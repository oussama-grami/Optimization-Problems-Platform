import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import {
  GraphColoringService,
  GraphColoringResult,
} from '../../services/graph-coloring.service';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';

interface Node {
  id: number;
  x: number;
  y: number;
  color: number | null;
  dragging: boolean;
}

interface Edge {
  source: number;
  target: number;
}

@Component({
  selector: 'app-grap-colouring',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './grap-colouring.component.html',
  styleUrl: './grap-colouring.component.css',
  providers: [GraphColoringService],
})
export class GrapColouringComponent implements OnInit, AfterViewInit {
  @ViewChild('graphCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private scale: number = 1;
  private offset = { x: 0, y: 0 };
  private lastMousePosition = { x: 0, y: 0 };
  private isDraggingCanvas = false;

  // Graph data
  nodes: Node[] = [];
  edges: Edge[] = [];
  adjacencyMatrix: number[][] = [];

  // Operation modes
  mode: 'add' | 'delete' | 'connect' | 'move' = 'move';
  connecting: Node | null = null;

  // Colors for graph coloring
  colorPalette: string[] = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA938',
    '#BE5AEC',
    '#59CD90',
    '#3FA7D6',
    '#FAC05E',
    '#F79D84',
    '#9ED9CC',
    '#008DD5',
    '#F4D35E',
    '#EE6055',
    '#60D394',
    '#5B8E7D',
    '#F7CB15',
  ];

  // Results
  chromaticNumber: number | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private graphColoringService: GraphColoringService) {}

  ngOnInit(): void {
    // Initialize with a small example graph
    this.addNode(100, 100);
    this.addNode(200, 100);
    this.addNode(150, 200);

    // Add some edges
    this.addEdge(0, 1);
    this.addEdge(1, 2);
    this.addEdge(2, 0);

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

    // Initial render
    this.renderGraph();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.parentElement!.clientWidth;
    canvas.height = 600;
    this.renderGraph();
  }

  private setupCanvasListeners(): void {
    const canvas = this.canvasRef.nativeElement;

    // Mouse down event
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale - this.offset.x;
      const y = (e.clientY - rect.top) / this.scale - this.offset.y;

      // Check if we're clicking on a node
      const clickedNode = this.findNodeAt(x, y);

      if (clickedNode !== null) {
        if (this.mode === 'add') {
          // Do nothing, we're in add mode
        } else if (this.mode === 'delete') {
          this.deleteNode(clickedNode);
        } else if (this.mode === 'connect') {
          if (this.connecting === null) {
            this.connecting = this.nodes[clickedNode];
          } else {
            // Create edge between connecting and clicked node
            if (this.connecting.id !== clickedNode) {
              this.addEdge(this.connecting.id, clickedNode);
              this.updateAdjacencyMatrix();
              this.renderGraph();
            }
            this.connecting = null;
          }
        } else if (this.mode === 'move') {
          // Start dragging the node
          this.nodes[clickedNode].dragging = true;
        }
      } else {
        // Not clicking on a node
        if (this.mode === 'add') {
          this.addNode(x, y);
          this.updateAdjacencyMatrix();
          this.renderGraph();
        } else if (this.mode === 'connect') {
          this.connecting = null;
        } else if (this.mode === 'move') {
          // Start dragging the canvas
          this.isDraggingCanvas = true;
          this.lastMousePosition = { x: e.clientX, y: e.clientY };
        }
      }
    });

    // Mouse move event
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale - this.offset.x;
      const y = (e.clientY - rect.top) / this.scale - this.offset.y;

      // Check if we're dragging any node
      let isDraggingNode = false;
      for (const node of this.nodes) {
        if (node.dragging) {
          node.x = x;
          node.y = y;
          isDraggingNode = true;
          this.renderGraph();
          break;
        }
      }

      // If we're connecting, update the view
      if (this.connecting !== null) {
        this.renderGraph();
        // Draw a line from connecting node to current mouse position
        this.ctx.beginPath();
        this.ctx.moveTo(
          this.connecting.x * this.scale + this.offset.x,
          this.connecting.y * this.scale + this.offset.y
        );
        this.ctx.lineTo(
          x * this.scale + this.offset.x,
          y * this.scale + this.offset.y
        );
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // If we're dragging the canvas (and not a node)
      if (this.isDraggingCanvas && !isDraggingNode) {
        const dx = e.clientX - this.lastMousePosition.x;
        const dy = e.clientY - this.lastMousePosition.y;
        this.offset.x += dx / this.scale;
        this.offset.y += dy / this.scale;
        this.lastMousePosition = { x: e.clientX, y: e.clientY };
        this.renderGraph();
      }
    });

    // Mouse up event
    canvas.addEventListener('mouseup', () => {
      // Stop dragging any nodes
      for (const node of this.nodes) {
        node.dragging = false;
      }
      this.isDraggingCanvas = false;
    });

    // Mouse leave event (same as mouse up)
    canvas.addEventListener('mouseleave', () => {
      // Stop dragging any nodes
      for (const node of this.nodes) {
        node.dragging = false;
      }
      this.isDraggingCanvas = false;
    });

    // Mouse wheel for zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert mouse position to world space before scaling
      const worldX = mouseX / this.scale - this.offset.x;
      const worldY = mouseY / this.scale - this.offset.y;

      // Apply zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale *= zoomFactor;

      // Limit scale
      this.scale = Math.min(Math.max(0.1, this.scale), 10);

      // Adjust offset to zoom towards mouse position
      this.offset.x = mouseX / this.scale - worldX;
      this.offset.y = mouseY / this.scale - worldY;

      this.renderGraph();
    });
  }

  private findNodeAt(x: number, y: number): number | null {
    const nodeRadius = 20;
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const distance = Math.sqrt(
        Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2)
      );
      if (distance <= nodeRadius) {
        return i;
      }
    }
    return null;
  }

  addNode(x: number, y: number): void {
    const id = this.nodes.length;
    this.nodes.push({
      id,
      x,
      y,
      color: null,
      dragging: false,
    });

    // Update adjacency matrix
    this.updateAdjacencyMatrix();
  }

  deleteNode(index: number): void {
    // Remove edges connected to this node
    this.edges = this.edges.filter(
      (edge) => edge.source !== index && edge.target !== index
    );

    // Remove the node
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
    this.renderGraph();
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
      this.edges.push({ source, target });
    }
  }

  deleteEdge(source: number, target: number): void {
    this.edges = this.edges.filter(
      (e) =>
        !(e.source === source && e.target === target) &&
        !(e.source === target && e.target === source)
    );

    // Update adjacency matrix
    this.updateAdjacencyMatrix();
    this.renderGraph();
  }

  updateAdjacencyMatrix(): void {
    const size = this.nodes.length;
    this.adjacencyMatrix = Array(size)
      .fill(0)
      .map(() => Array(size).fill(0));

    for (const edge of this.edges) {
      this.adjacencyMatrix[edge.source][edge.target] = 1;
      this.adjacencyMatrix[edge.target][edge.source] = 1; // Undirected graph
    }
  }

  matrixValueChanged(i: number, j: number): void {
    // If the value changed to 1, add an edge
    if (this.adjacencyMatrix[i][j] === 1) {
      this.addEdge(i, j);
    } else {
      // If the value changed to 0, remove the edge
      this.deleteEdge(i, j);
    }

    // Make sure matrix stays symmetric (undirected graph)
    this.adjacencyMatrix[j][i] = this.adjacencyMatrix[i][j];

    this.renderGraph();
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

        // Apply colors to nodes
        for (let i = 0; i < this.nodes.length; i++) {
          this.nodes[i].color = result.coloredGraph[i];
        }

        this.isLoading = false;
        this.renderGraph();
      },
      error: (error) => {
        this.error =
          'Error coloring graph: ' + (error.message || 'Unknown error');
        this.isLoading = false;
      },
    });
  }

  renderGraph(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid
    this.drawGrid();

    // Draw edges
    for (const edge of this.edges) {
      const source = this.nodes[edge.source];
      const target = this.nodes[edge.target];

      this.ctx.beginPath();
      this.ctx.moveTo(
        source.x * this.scale + this.offset.x,
        source.y * this.scale + this.offset.y
      );
      this.ctx.lineTo(
        target.x * this.scale + this.offset.x,
        target.y * this.scale + this.offset.y
      );
      this.ctx.strokeStyle = '#999';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw nodes
    const nodeRadius = 20 * this.scale;
    for (const node of this.nodes) {
      this.ctx.beginPath();
      this.ctx.arc(
        node.x * this.scale + this.offset.x,
        node.y * this.scale + this.offset.y,
        nodeRadius,
        0,
        Math.PI * 2
      );

      // Fill with color if node is colored
      if (node.color !== null) {
        this.ctx.fillStyle =
          this.colorPalette[node.color % this.colorPalette.length];
      } else {
        this.ctx.fillStyle = '#fff';
      }

      this.ctx.fill();
      this.ctx.strokeStyle = node === this.connecting ? '#ff0000' : '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Draw node label
      this.ctx.fillStyle = '#000';
      this.ctx.font = `${14 * this.scale}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        node.id.toString(),
        node.x * this.scale + this.offset.x,
        node.y * this.scale + this.offset.y
      );
    }
  }

  private drawGrid(): void {
    const canvas = this.canvasRef.nativeElement;
    const gridSize = 50 * this.scale;

    this.ctx.strokeStyle = '#eee';
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
    this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.renderGraph();
  }

  resetGraph(): void {
    this.nodes = [];
    this.edges = [];
    this.adjacencyMatrix = [];
    this.chromaticNumber = null;
    this.renderGraph();
  }

  exportImage(): void {
    const canvas = this.canvasRef.nativeElement;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'graph.png';
    link.click();
  }

  exportMatrix(): void {
    const jsonStr = JSON.stringify(this.adjacencyMatrix);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'adjacency_matrix.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  importMatrix(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const matrix = JSON.parse(content);

        if (
          Array.isArray(matrix) &&
          matrix.every((row) => Array.isArray(row))
        ) {
          // Clear existing graph
          this.resetGraph();

          // Create nodes in a circle layout
          const numNodes = matrix.length;
          const radius = 150;
          const centerX = 300;
          const centerY = 300;

          for (let i = 0; i < numNodes; i++) {
            const angle = (i / numNodes) * 2 * Math.PI;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            this.addNode(x, y);
          }

          // Create edges based on adjacency matrix
          for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
              if (matrix[i][j] === 1) {
                this.addEdge(i, j);
              }
            }
          }

          this.adjacencyMatrix = matrix;
          this.renderGraph();
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
}
