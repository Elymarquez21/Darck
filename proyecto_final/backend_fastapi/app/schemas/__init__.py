"""
Esquemas Pydantic usados para validar los datos que entran (request
body) y para dar forma a los datos que salen (response_model) en la
API. Se mantienen separados de los modelos ORM (app/models):

  - app/models   -> cómo se ven las tablas en la base de datos.
  - app/schemas  -> qué datos acepta/devuelve la API y con qué reglas.
"""
