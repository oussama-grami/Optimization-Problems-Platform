import gurobipy as gp
from gurobipy import GRB
import networkx as nx
from flask import request, jsonify
import json

def dsatur_coloring_nx(G):
    """Applies DSatur coloring using NetworkX."""
    coloring = nx.coloring.greedy_color(G, strategy='DSATUR')
    return coloring

def solve_graph_coloring_gurobi(G):
    """
    Solves the graph coloring problem directly using Gurobi.
    
    This approach directly finds the minimum number of colors needed
    by using a binary search approach integrated with Gurobi.
    """
    n = len(G.nodes())
    
    # Start with upperbounds from basic heuristics
    upper_bound = min(n, max(G.degree())[1] + 1)  # Simple degree-based upper bound
    lower_bound = 1
    
    # For very large graphs, use NetworkX to get a better initial upper bound
    LARGE_MATRIX_THRESHOLD = 20
    if n > LARGE_MATRIX_THRESHOLD:
        # Use NetworkX as a fast heuristic to get a better upper bound
        nx_coloring = dsatur_coloring_nx(G)
        upper_bound = min(upper_bound, len(set(nx_coloring.values())))
        print(f"Using NetworkX heuristic for large graph: upper bound = {upper_bound}")
    
    best_k = upper_bound
    optimal_coloring = None
    
    # Binary search to find the chromatic number
    while lower_bound <= upper_bound:
        k = (lower_bound + upper_bound) // 2
        print(f"Trying k={k} colors...")
        
        # Build the model for k-coloring
        model = gp.Model(f"k_coloring_{k}")
        V = list(G.nodes())
        x = model.addVars(V, range(k), vtype=GRB.BINARY, name="x")
        
        # Each vertex must have exactly one color
        for v in V:
            model.addConstr(gp.quicksum(x[v, j] for j in range(k)) == 1, f"one_color_{v}")
        
        # Adjacent vertices must have different colors
        for u, v in G.edges():
            for j in range(k):
                model.addConstr(x[u, j] + x[v, j] <= 1, f"no_same_color_{u}_{v}_{j}")
        
        # If we have a previous coloring and are trying a smaller k
        if optimal_coloring and k < best_k:
            # Try to reuse parts of the previous solution
            for v in V:
                old_color = optimal_coloring[v]
                if old_color < k:  # If the old color is still valid
                    x[v, old_color].Start = 1
        
        # We are checking feasibility, so no objective function needed
        model.setObjective(0, GRB.MINIMIZE)
        model.optimize()
        
        if model.Status == GRB.OPTIMAL:
            # Found a feasible coloring with k colors
            best_k = k
            upper_bound = k - 1
            
            # Extract the coloring
            current_coloring = {}
            for v in G.nodes():
                for j in range(k):
                    if x[v, j].X > 0.5:
                        current_coloring[v] = j
                        break
            optimal_coloring = current_coloring
        else:
            # No feasible k-coloring exists, try with more colors
            lower_bound = k + 1
    
    return best_k, optimal_coloring

def solve_graph_coloring_adj_matrix(adj_matrix):
    """Solves graph coloring for a graph represented by an adjacency matrix."""
    n = len(adj_matrix)
    G = nx.Graph()
    for i in range(n):
        G.add_node(i)
        for j in range(i + 1, n):
            if adj_matrix[i][j] == 1:
                G.add_edge(i, j)
    
    # Use the improved single-step Gurobi approach
    chromatic_number, optimal_coloring = solve_graph_coloring_gurobi(G)
    
    # Convert to array format for the API response
    colored_graph_array = [optimal_coloring.get(i) for i in range(n)] if optimal_coloring else None
    return chromatic_number, colored_graph_array

def get_adjacency_matrix_from_user():
    """Prompts the user to enter the adjacency matrix."""
    while True:
        try:
            num_nodes_str = input("Enter the number of nodes in the graph: ")
            num_nodes = int(num_nodes_str)
            if num_nodes <= 0:
                print("Number of nodes must be positive.")
                continue
            break
        except ValueError:
            print("Invalid input. Please enter an integer for the number of nodes.")

    adj_matrix = []
    print("Enter the adjacency matrix row by row. For each row, enter space-separated 0s and 1s.")
    print(f"You need to enter {num_nodes} rows, each with {num_nodes} values.")

    for i in range(num_nodes):
        while True:
            try:
                row_str = input(f"Enter row {i + 1}: ")
                row = [int(x) for x in row_str.split()]
                if len(row) != num_nodes:
                    print(f"Row {i + 1} must have {num_nodes} values. Please try again.")
                    continue
                if not all(x == 0 or x == 1 for x in row):
                    print("Row values must be either 0 or 1. Please try again.")
                    continue
                adj_matrix.append(row)
                break
            except ValueError:
                print("Invalid input. Please enter space-separated integers (0 or 1).")

    # Ensure the matrix is square
    if len(adj_matrix) != num_nodes or any(len(row) != num_nodes for row in adj_matrix):
        raise ValueError("The entered data does not form a square adjacency matrix.")

    return adj_matrix

# Flask route for graph coloring
def register_graph_coloring_routes(app):
    @app.route('/graph-coloring', methods=['POST'])
    def color_graph():
        try:
            data = request.get_json()
            adjacency_matrix = data.get('adjacencyMatrix')
            
            if not adjacency_matrix:
                return jsonify({'error': 'Adjacency matrix not provided'}), 400
                
            chromatic_number, colored_array = solve_graph_coloring_adj_matrix(adjacency_matrix)
            
            if chromatic_number is not None:
                return jsonify({
                    'chromaticNumber': chromatic_number,
                    'coloredGraph': colored_array
                })
            else:
                return jsonify({'error': 'Could not find a valid coloring'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/graph-coloring/check', methods=['GET'])
    def check_service():
        return jsonify({'status': 'Graph coloring service is running'})
        
# The code below will only execute when this file is run directly
if __name__ == "__main__":
    try:
        env = gp.Env()
        # Replace with your actual WLS credentials if needed
        # env.setParam('WLSAccessID', 'your_access_id')
        # env.setParam('WLSSecret', 'your_secret')
        # env.setParam('LicenseID', your_license_id)
        env.start()
        gp.Model(env=env) 
    except gp.GurobiError as e:
        print(f"Gurobi error: {e}")
        exit()

    adjacency_matrix = get_adjacency_matrix_from_user()
    chromatic_number, colored_array = solve_graph_coloring_adj_matrix(adjacency_matrix)

    if chromatic_number is not None:
        print(f"Chromatic Number: {chromatic_number}")
        print(f"Colored Graph (Array): {colored_array}")
    else:
        print("Could not find a valid coloring.")