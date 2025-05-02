import gurobipy as gp
from gurobipy import GRB
import networkx as nx
from flask import request, jsonify
import json

def dsatur_coloring_nx(G):
    """Applies DSatur coloring using NetworkX and returns the number of colors."""
    coloring = nx.coloring.greedy_color(G, strategy='DSATUR')
    return len(set(coloring.values()))

def build_model_k_coloring(G, k):
    """Builds an ILP model to check if a k-coloring exists."""
    model = gp.Model(f"k_coloring_{k}")
    V = list(G.nodes())
    x = model.addVars(V, range(k), vtype=GRB.BINARY, name="x")

    for v in V:
        model.addConstr(gp.quicksum(x[v, j] for j in range(k)) == 1, f"one_color_{v}")

    for u, v in G.edges():
        for j in range(k):
            model.addConstr(x[u, j] + x[v, j] <= 1, f"no_same_color_{u}_{v}_{j}")

    model.Params.Presolve = 2
    model.Params.Cuts = 2
    model.Params.MIPFocus = 1
    model.Params.Heuristics = 0.8
    model.Params.Threads = 0
    model.setObjective(0, GRB.MINIMIZE)
    return model, x

def solve_graph_coloring_adj_matrix(adj_matrix):
    """Solves graph coloring for a graph represented by an adjacency matrix."""
    n = len(adj_matrix)
    G = nx.Graph()
    for i in range(n):
        G.add_node(i)
        for j in range(i + 1, n):
            if adj_matrix[i][j] == 1:
                G.add_edge(i, j)

    initial_num_colors = dsatur_coloring_nx(G)
    lower_bound = 1
    upper_bound = initial_num_colors + 1
    best_k = upper_bound
    optimal_coloring = None

    while lower_bound <= upper_bound:
        k = (lower_bound + upper_bound) // 2
        model, x = build_model_k_coloring(G, k)
        model.optimize()

        if model.Status == GRB.OPTIMAL:
            best_k = k
            upper_bound = k - 1
            current_coloring = {}
            for v in G.nodes():
                for j in range(k):
                    if x[v, j].X > 0.5:
                        current_coloring[v] = j
                        break
            optimal_coloring = current_coloring
        else:
            lower_bound = k + 1

    colored_graph_array = [optimal_coloring.get(i) for i in range(n)] if optimal_coloring else None
    return best_k, colored_graph_array

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