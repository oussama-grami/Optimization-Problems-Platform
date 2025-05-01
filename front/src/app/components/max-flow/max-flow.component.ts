import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {MaxFlowRequest, MaxFlowResponse, MaxFlowService} from '../../services/max-flow.service';
import {NgForOf, NgIf} from '@angular/common';

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
}

interface Edge {
  id: string;
  from: number;
  to: number;
  capacity: number;
  flow?: number;
}

@Component({
  selector: 'app-max-flow',
  standalone: true,
  imports: [
    NgIf,
    NgForOf
  ],
  templateUrl: './max-flow.component.html',
  styleUrls: ['./max-flow.component.css']
})
export class MaxFlowComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('graphCanvas') graphCanvas!: ElementRef;

  nodes: Node[] = [];
  edges: Edge[] = [];
  source: number | null = null;
  sink: number | null = null;

  // Contrôles UI
  mode: 'add-node' | 'add-edge' | 'select-source' | 'select-sink' | 'move-node' | 'delete' = 'add-node';
  selectedNode: Node | null = null;
  capacity: number = 10;

  // Zoom et déplacement
  zoom: number = 1;
  pan = { x: 0, y: 0 };
  isDragging = false;
  dragStart = { x: 0, y: 0 };

  // Résultats
  result: MaxFlowResponse | null = null;
  isLoading = false;
  error: string | null = null;

  // Dimensions
  width = 800;
  height = 600;
  nodeRadius = 20;

  // Sélections D3
  svg: any;
  g: any; // Groupe principal pour les éléments zoomables
  nodeSelection: any;
  edgeSelection: any;
  edgeLabelSelection: any;
  edgePath: any;
  simulation: any;

  // Gestion de la durée de vie du composant
  private destroy$ = new Subject<void>();

  constructor(private maxFlowService: MaxFlowService) { }

  ngOnInit(): void {
    // Vérifier si le graphe a été sauvegardé localement
    this.loadSavedGraph();
  }

  ngAfterViewInit(): void {
    // Permettre au DOM de se stabiliser avant d'initialiser le SVG
    setTimeout(() => {
      this.initializeSVG();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Sauvegarder l'état actuel du graphe
    this.saveGraphLocally();

    // Nettoyer les ressources D3
    if (this.simulation) {
      this.simulation.stop();
    }
  }

  initializeSVG(): void {
    if (!this.graphCanvas || !this.graphCanvas.nativeElement) {
      console.error('Élément graphCanvas non disponible');
      return;
    }

    const container = this.graphCanvas.nativeElement;

    // Ajuster la taille au conteneur parent
    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 600;

    // Créer le SVG principal
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .style('border', '1px solid #ccc')
      .style('background-color', '#f9f9f9');

    // Créer un groupe pour les éléments zoomables
    this.g = this.svg.append('g');

    // Configurer le zoom
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(zoom);

    // Double-clic pour réinitialiser le zoom
    this.svg.on('dblclick.zoom', () => {
      this.svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    });

    // Clic simple pour ajouter un nœud
    this.svg.on('click', (event:any) => {
      if (this.mode === 'add-node') {
        event.preventDefault();
        event.stopPropagation();
        this.handleCanvasClick(event);
      }
    });

    // Définir les flèches pour les arêtes
    this.svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', this.nodeRadius + 5)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Ajouter des éléments de groupe pour les arêtes et nœuds
    this.edgePath = this.g.append('g').attr('class', 'edges');
    this.g.append('g').attr('class', 'edge-labels');
    this.g.append('g').attr('class', 'nodes');

    // Configurer la simulation de force pour un meilleur placement des nœuds
    this.simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(this.nodeRadius * 2));

    // Initialiser la simulation avec les nœuds existants
    if (this.nodes.length > 0) {
      this.updateGraph(true);
    }
  }

  handleCanvasClick(event: any): void {
    if (this.mode !== 'add-node') return;

    // Récupérer les coordonnées du clic relatives au SVG
    const point = d3.pointer(event, this.svg.node());

    // S'assurer que les coordonnées sont dans le SVG
    if (point[0] < 0 || point[0] > this.width || point[1] < 0 || point[1] > this.height) {
      return;
    }

    // Éviter de créer un nœud si on clique trop près d'un nœud existant
    const clickedOnNode = this.nodes.some(node =>
      Math.sqrt(Math.pow(node.x - point[0], 2) + Math.pow(node.y - point[1], 2)) < this.nodeRadius * 2
    );

    if (!clickedOnNode) {
      const newNode = {
        id: this.getNextNodeId(),
        x: point[0],
        y: point[1],
        label: this.getNextNodeId().toString()
      };

      console.log('Nouveau nœud créé:', newNode);
      this.nodes = [...this.nodes, newNode];
      this.updateGraph();

      // Sauvegarder après modification
      this.saveGraphLocally();
    }
  }

  getNextNodeId(): number {
    // Trouver le prochain ID disponible (peut ne pas être séquentiel en cas de suppression)
    if (this.nodes.length === 0) return 0;
    return Math.max(...this.nodes.map(n => n.id)) + 1;
  }

  handleNodeClick(node: Node): void {
    switch (this.mode) {
      case 'select-source':
        this.source = node.id;
        this.mode = 'add-node';
        break;

      case 'select-sink':
        this.sink = node.id;
        this.mode = 'add-node';
        break;

      case 'add-edge':
        if (!this.selectedNode) {
          this.selectedNode = node;
        } else if (this.selectedNode.id !== node.id) {
          // Vérifier s'il existe déjà une arête entre ces nœuds
          const edgeExists = this.edges.some(
            edge => edge.from === this.selectedNode!.id && edge.to === node.id
          );

          if (!edgeExists) {
            const newEdge = {
              id: `${this.selectedNode.id}-${node.id}`,
              from: this.selectedNode.id,
              to: node.id,
              capacity: this.capacity
            };

            this.edges = [...this.edges, newEdge];
            this.updateGraph();

            // Sauvegarder après modification
            this.saveGraphLocally();
          }
          this.selectedNode = null;
        }
        break;

      case 'add-node':
        // Sélection simple d'un nœud (pour information)
        break;

      case 'move-node':
        // Le déplacement est géré par le drag & drop de D3
        break;

      case 'delete':
        // Supprimer le nœud en mode suppression
        this.deleteNode(node.id);
        break;
    }

    // Mettre à jour le graphe après tout changement d'état
    this.updateGraph();
  }
  handleEdgeClick(edge: Edge): void {
    if (this.mode === 'delete') {
      this.deleteEdge(edge.id);
    }
  }

  updateGraph(initialize = false): void {
    if (!this.svg || !this.g) return;

    // Mettre à jour les données de simulation
    if (initialize) {
      this.simulation.nodes(this.nodes);

      // Configurer les liens pour la simulation
      if (this.edges.length > 0) {
        const linkForce = this.simulation.force('link');
        linkForce.links(this.edges.map(e => ({
          source: this.nodes.find(n => n.id === e.from),
          target: this.nodes.find(n => n.id === e.to),
          capacity: e.capacity
        })));
      }
    }

    // Récupérer les conteneurs de sélection
    const edgesContainer = this.g.select('.edges');
    const nodesContainer = this.g.select('.nodes');
    const labelsContainer = this.g.select('.edge-labels');

    // --- MISE À JOUR DES ARÊTES ---
    this.edgeSelection = edgesContainer.selectAll('line.edge')
      .data(this.edges, (d: Edge) => d.id);


    // Supprimer les anciennes arêtes
    this.edgeSelection.exit().remove();

    // Ajouter les nouvelles arêtes
    const newEdges = this.edgeSelection.enter()
      .append('line')
      .attr('class', 'edge')
      .style('stroke', '#999')
      .style('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    if (this.mode === 'delete') {
      newEdges.style('cursor', 'not-allowed')
        .on('click', (event: any, d: any) => {
          event.stopPropagation();
          this.handleEdgeClick(d);
        });
    } else {
      newEdges.style('cursor', 'default')
        .on('click', null);
    }
    // Fusionner les sélections
    this.edgeSelection = newEdges.merge(this.edgeSelection);
    this.edgeSelection.style('cursor', this.mode === 'delete' ? 'not-allowed' : 'default')
      .on('click', this.mode === 'delete' ? (event: any, d: any) => {
        event.stopPropagation();
        this.handleEdgeClick(d);
      } : null);

    // Mettre à jour les positions des arêtes
    this.edgeSelection
      .attr('x1', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        return sourceNode ? sourceNode.x : 0;
      })
      .attr('y1', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        return sourceNode ? sourceNode.y : 0;
      })
      .attr('x2', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        const targetNode = this.nodes.find(n => n.id === d.to);
        if (!sourceNode || !targetNode) return 0;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Ajuster pour que la ligne s'arrête à la bordure du nœud cible
        return sourceNode.x + (distance - this.nodeRadius) * Math.cos(angle);
      })
      .attr('y2', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        const targetNode = this.nodes.find(n => n.id === d.to);
        if (!sourceNode || !targetNode) return 0;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Ajuster pour que la ligne s'arrête à la bordure du nœud cible
        return sourceNode.y + (distance - this.nodeRadius) * Math.sin(angle);
      })
      .style('stroke', (d: Edge) => d.flow ? '#3498db' : '#999')
      .style('stroke-width', (d: Edge) => d.flow && d.flow > 0 ? 3 : 2)
      .style('stroke-opacity', (d: Edge) => d.flow && d.flow > 0 ? 0.8 : 0.5);

    // --- MISE À JOUR DES ÉTIQUETTES D'ARÊTES ---
    this.edgeLabelSelection = labelsContainer.selectAll('text.edge-label')
      .data(this.edges, (d: Edge) => d.id);

    this.edgeLabelSelection.exit().remove();

    const newLabels = this.edgeLabelSelection.enter()
      .append('text')
      .attr('class', 'edge-label')
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'central')
      .style('fill', '#555')
      .style('font-size', '12px')
      .style('pointer-events', 'none');

    this.edgeLabelSelection = newLabels.merge(this.edgeLabelSelection);

    this.edgeLabelSelection
      .attr('x', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        const targetNode = this.nodes.find(n => n.id === d.to);
        if (!sourceNode || !targetNode) return 0;

        // Positionner l'étiquette au milieu de l'arête
        return (sourceNode.x + targetNode.x) / 2;
      })
      .attr('y', (d: Edge) => {
        const sourceNode = this.nodes.find(n => n.id === d.from);
        const targetNode = this.nodes.find(n => n.id === d.to);
        if (!sourceNode || !targetNode) return 0;

        // Décaler légèrement l'étiquette au-dessus de l'arête
        return (sourceNode.y + targetNode.y) / 2 - 10;
      })
      .text((d: Edge) => {
        if (d.flow !== undefined) {
          return `${d.flow}/${d.capacity}`;
        }
        return `${d.capacity}`;
      })
      .classed('with-flow', (d: Edge) => d.flow !== undefined && d.flow > 0);

    // --- MISE À JOUR DES NŒUDS ---
    this.nodeSelection = nodesContainer.selectAll('g.node')
      .data(this.nodes, (d: Node) => d.id);

    this.nodeSelection.exit().remove();

    // Créer de nouveaux nœuds
    const newNodes = this.nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (event: any, d:any) => {
        event.stopPropagation();
        this.handleNodeClick(d);
      });

    // Ajouter le cercle pour chaque nœud
    newNodes.append('circle')
      .attr('r', this.nodeRadius)
      .attr('fill', (d: Node) => {
        if (d.id === this.source) return '#5cb85c';  // Source en vert
        if (d.id === this.sink) return '#d9534f';    // Puits en rouge
        return '#337ab7';                           // Autres nœuds en bleu
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Ajouter le texte d'étiquette pour chaque nœud
    newNodes.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('fill', '#fff')
      .attr('font-weight', 'bold')
      .text((d: Node) => d.label);

    // Ajouter un titre pour l'info-bulle
    newNodes.append('title')
      .text((d: Node) => {
        if (d.id === this.source) return `Nœud ${d.id} (Source)`;
        if (d.id === this.sink) return `Nœud ${d.id} (Puits)`;
        return `Nœud ${d.id}`;
      });

    // Fusionner avec les nœuds existants
    this.nodeSelection = newNodes.merge(this.nodeSelection);

    // Mettre à jour la position et l'apparence des nœuds
    this.nodeSelection
      .attr('transform', (d: Node) => `translate(${d.x}, ${d.y})`)
      .select('circle')
      .attr('fill', (d: Node) => {
        if (d.id === this.source) return '#5cb85c';  // Source en vert
        if (d.id === this.sink) return '#d9534f';    // Puits en rouge
        return '#337ab7';                           // Autres nœuds en bleu
      });

    // Mettre à jour le titre (info-bulle)
    this.nodeSelection.select('title')
      .text((d: Node) => {
        if (d.id === this.source) return `Nœud ${d.id} (Source)`;
        if (d.id === this.sink) return `Nœud ${d.id} (Puits)`;
        return `Nœud ${d.id}`;
      });

    // Configurer la fonctionnalité de glisser-déposer pour les nœuds
    if (this.mode === 'move-node') {
      const dragHandler = d3.drag()
        .on('start', (event, d: any) => {
          if (!event.active) this.simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;

          // Mettre à jour immédiatement la position pour un meilleur feedback
          d.x = event.x;
          d.y = event.y;
          this.updateGraph();
        })
        .on('end', (event, d: any) => {
          if (!event.active) this.simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;

          // Sauvegarder l'état après le déplacement
          this.saveGraphLocally();
        });

      this.nodeSelection.call(dragHandler);
    } else {
      // Désactiver le glisser-déposer si le mode n'est pas 'move-node'
      this.nodeSelection.on('.drag', null);
    }

    // Si la simulation est active, mettre à jour la position des nœuds à chaque tick
    if (initialize) {
      this.simulation.on('tick', () => {
        this.updateGraph();
      });

      // Démarrer la simulation
      this.simulation.alpha(1).restart();
    }
  }

  setMode(newMode: 'add-node' | 'add-edge' | 'select-source' | 'select-sink' | 'move-node' | 'delete'): void {
    this.mode = newMode;
    this.selectedNode = null;

    // Modifier le curseur en fonction du mode
    if (this.svg) {
      let cursor = 'default';
      if (this.mode === 'add-node') cursor = 'crosshair';
      if (this.mode === 'delete') cursor = 'not-allowed';
      this.svg.style('cursor', cursor);
    }

    // Mettre à jour les gestionnaires de glisser-déposer si nécessaire
    this.updateGraph();
  }

  onCapacityChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value ?? '1';
    this.updateCapacity(value);
  }

  updateCapacity(value: string): void {
    this.capacity = parseInt(value, 10) || 1;
    if (this.capacity < 1) this.capacity = 1;
  }

  resetGraph(): void {
    this.nodes = [];
    this.edges = [];
    this.source = null;
    this.sink = null;
    this.result = null;
    this.updateGraph();

    // Supprimer les données sauvegardées
    localStorage.removeItem('maxflow-graph');
  }

  calculateMaxFlow(): void {
    if (this.source === null || this.sink === null) {
      this.error = 'Veuillez sélectionner un nœud source et un nœud puits';
      return;
    }

    if (this.nodes.length < 2) {
      this.error = 'Veuillez ajouter au moins deux nœuds';
      return;
    }

    if (this.edges.length === 0) {
      this.error = 'Veuillez ajouter au moins une arête';
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Préparer les données pour l'API
    const graph = this.edges.map(edge => [edge.from, edge.to]);
    const capacities: { [key: string]: number } = {};

    this.edges.forEach(edge => {
      capacities[`${edge.from},${edge.to}`] = edge.capacity;
    });

    const requestData: MaxFlowRequest = {
      graph,
      capacities,
      source: this.source,
      sink: this.sink
    };

    // Appeler l'API via le service
    this.maxFlowService.calculateMaxFlow(requestData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.result = response;
          this.isLoading = false;

          // Mettre à jour les flux sur les arêtes
          this.edges = this.edges.map(edge => {
            const flowKey = `${edge.from},${edge.to}`;
            return {
              ...edge,
              flow: response.flows[flowKey] || 0
            };
          });

          this.updateGraph();

          // Sauvegarder l'état avec les résultats
          this.saveGraphLocally();
        },
        error: (err: Error | unknown) => {
          this.error = 'Erreur lors du calcul du flux maximum: ' +
            (err instanceof Error ? err.message : 'Erreur inconnue');
          this.isLoading = false;
        }
      });
  }

  // Sauvegarde et chargement locaux (pour permettre la persistance)
  saveGraphLocally(): void {
    const graphData = {
      nodes: this.nodes,
      edges: this.edges,
      source: this.source,
      sink: this.sink,
      result: this.result
    };

    localStorage.setItem('maxflow-graph', JSON.stringify(graphData));
  }

  loadSavedGraph(): void {
    const savedData = localStorage.getItem('maxflow-graph');
    if (savedData) {
      try {
        const graphData = JSON.parse(savedData);
        this.nodes = graphData.nodes || [];
        this.edges = graphData.edges || [];
        this.source = graphData.source;
        this.sink = graphData.sink;
        this.result = graphData.result;
      } catch (e) {
        console.error('Erreur lors du chargement du graphe sauvegardé:', e);
      }
    }
  }

  // Export et import du graphe
  exportGraph(): void {
    const graphData = {
      nodes: this.nodes,
      edges: this.edges,
      source: this.source,
      sink: this.sink,
      result: this.result
    };

    const dataStr = JSON.stringify(graphData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'max-flow-graph.json');
    exportLink.click();
  }

  importGraph(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const graphData = JSON.parse(content);

        if (graphData.nodes && graphData.edges) {
          this.nodes = graphData.nodes;
          this.edges = graphData.edges;
          this.source = graphData.source;
          this.sink = graphData.sink;
          this.result = graphData.result;

          this.updateGraph(true);
          this.saveGraphLocally();
        }
      } catch (err) {
        this.error = 'Erreur lors de l\'importation du graphe';
      }
    };
    reader.readAsText(file);

    // Réinitialiser l'input pour permettre de recharger le même fichier
    target.value = '';
  }

  // Méthode pour supprimer un nœud (fonctionnalité supplémentaire)
  deleteNode(nodeId: number): void {
    // Supprimer le nœud
    this.nodes = this.nodes.filter(n => n.id !== nodeId);

    // Supprimer toutes les arêtes connectées à ce nœud
    this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);

    // Réinitialiser source/sink si nécessaire
    if (this.source === nodeId) this.source = null;
    if (this.sink === nodeId) this.sink = null;

    // Réinitialiser les résultats car le graphe a changé
    this.result = null;

    this.updateGraph();
    this.saveGraphLocally();
  }

  // Méthode pour supprimer une arête
  deleteEdge(edgeId: string): void {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.result = null;
    this.updateGraph();
    this.saveGraphLocally();
  }
}
