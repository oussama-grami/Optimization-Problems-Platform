from flask import Flask, request, jsonify
from ortools.linear_solver import pywraplp
from flask_cors import CORS
import gurobipy as gp

app = Flask(__name__)
CORS(app)

#Max flow problem Algorithm , Don't touch this
from gurobipy import Model, GRB

def max_flow_lp_gurobi(graph, capacities, source, sink):
    model = Model("max_flow")

    # Créer les variables de flux
    flow = {}
    for (i, j) in graph:
        cap = capacities[f"{i},{j}"]
        flow[(i, j)] = model.addVar(lb=0, ub=cap, vtype=GRB.CONTINUOUS, name=f'f_{i}_{j}')

    model.update()

    # Contraintes : pas d'entrée dans le source
    for (i, j) in graph:
        if j == source:
            model.addConstr(flow[(i, j)] == 0)

    # Conservation du flux (Kirchhoff) pour tous les nœuds sauf source et puits
    nodes = set(i for (i, j) in graph) | set(j for (i, j) in graph)
    for node in nodes:
        if node == source or node == sink:
            continue
        inflow = [flow[(i, j)] for (i, j) in graph if j == node]
        outflow = [flow[(i, j)] for (i, j) in graph if i == node]
        model.addConstr(sum(inflow) == sum(outflow))

    # Objectif : maximiser le flux total sortant du source
    total_out = [flow[(i, j)] for (i, j) in graph if i == source]
    model.setObjective(sum(total_out), GRB.MAXIMIZE)

    # Résolution
    model.optimize()

    if model.status == GRB.OPTIMAL:
        result = {
            "max_flow": model.objVal,
            "flows": {f"{i},{j}": flow[(i, j)].X for (i, j) in graph}
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

    result = max_flow_lp_gurobi(graph, capacities, source, sink)
    return jsonify(result)

if __name__ == '__main__':
    app.run()
