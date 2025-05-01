from flask import Flask, request, jsonify
from ortools.linear_solver import pywraplp
from flask_cors import CORS
from graph import register_graph_coloring_routes

app = Flask(__name__)
CORS(app)

#Max flow problem Algorithm , Don't touch this
def max_flow_lp(graph, capacities, source, sink):
    solver = pywraplp.Solver.CreateSolver('CBC')
    flow = {}
    for (i, j) in graph:
        flow[(i, j)] = solver.NumVar(0, capacities[f"{i},{j}"], f'f_{i}_{j}')
    for (i, j) in graph:
        if j == source:
            solver.Add(flow[(i, j)] == 0)

    nodes = set(i for (i, j) in graph) | set(j for (i, j) in graph)
    for node in nodes:
        if node == source or node == sink:
            continue
        inflow = [flow[(i, j)] for (i, j) in graph if j == node]
        outflow = [flow[(i, j)] for (i, j) in graph if i == node]
        solver.Add(solver.Sum(inflow) == solver.Sum(outflow))

    total_out = [flow[(i, j)] for (i, j) in graph if i == source]
    solver.Maximize(solver.Sum(total_out))

    status = solver.Solve()

    if status == pywraplp.Solver.OPTIMAL:
        result = {
            "max_flow": solver.Objective().Value(),
            "flows": {f"{i},{j}": flow[(i, j)].solution_value() for (i, j) in graph}
        }
        return result
    else:
        return {"error": "No optimal solution found"}

# end of algorithm.


@app.route('/')
def hello_world():  # put application's code here
    return 'Hello World!'

@app.route('/maxflow', methods=['POST'])
def run_max_flow():
    data = request.get_json()

    graph = [tuple(pair) for pair in data['graph']]
    capacities = data['capacities']
    source = data['source']
    sink = data['sink']

    result = max_flow_lp(graph, capacities, source, sink)
    return jsonify(result)

register_graph_coloring_routes(app)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('FLASK_RUN_PORT', 5000))
    # Always bind to 0.0.0.0 to allow external connections to container
    app.run(host='0.0.0.0', port=port, debug=False)
