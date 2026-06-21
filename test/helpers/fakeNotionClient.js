export class FakeNotionClient {
  constructor() {
    this.calls = [];
    this.objects = new Map();
    this.rows = new Map();
    this.viewObjects = new Map();
    this.children = new Map();
    this.counter = 0;
    this.failViewCreation = false;
    this.failViewUpdate = false;

    this.pages = {
      retrieve: async ({ page_id }) => this.#record("pages.retrieve", { page_id }, () => {
        const value = this.objects.get(page_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      create: async (args) => this.#record("pages.create", args, () => {
        const id = this.#id("page");
        const children = (args.children ?? []).map((child) => ({ ...child, id: this.#id("block") }));
        const object = { object: "page", id, ...args, children: undefined, in_trash: false };
        this.objects.set(id, object);
        this.children.set(id, children);
        return object;
      }),
    };
    this.databases = {
      retrieve: async ({ database_id }) => this.#record("databases.retrieve", { database_id }, () => {
        const value = this.objects.get(database_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      create: async (args) => this.#record("databases.create", args, () => {
        const id = this.#id("database");
        const dataSourceId = this.#id("datasource");
        const properties = Object.fromEntries(Object.entries(args.initial_data_source?.properties ?? {})
          .map(([name, value]) => [name, { id: this.#id("property"), ...value }]));
        const dataSource = { object: "data_source", id: dataSourceId, properties };
        const object = { object: "database", id, data_sources: [{ id: dataSourceId, name: args.initial_data_source?.title?.[0]?.text?.content ?? "" }], ...args };
        this.objects.set(id, object);
        this.objects.set(dataSourceId, dataSource);
        return object;
      }),
    };
    this.dataSources = {
      retrieve: async ({ data_source_id }) => this.#record("dataSources.retrieve", { data_source_id }, () => {
        const value = this.objects.get(data_source_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
      update: async (args) => this.#record("dataSources.update", args, () => {
        const value = this.objects.get(args.data_source_id) ?? { id: args.data_source_id, properties: {} };
        const additions = Object.fromEntries(Object.entries(args.properties ?? {}).map(([name, property]) => [
          name, { id: value.properties[name]?.id ?? this.#id("property"), ...property },
        ]));
        value.properties = { ...value.properties, ...additions };
        this.objects.set(args.data_source_id, value);
        return value;
      }),
      query: async (args) => this.#record("dataSources.query", args, () => ({
        object: "list",
        results: [...(this.rows.get(args.data_source_id) ?? [])],
        has_more: false,
        next_cursor: null,
      })),
    };
    this.views = {
      create: async (args) => this.#record("views.create", args, () => {
        if (this.failViewCreation) throw Object.assign(new Error("views unavailable"), { status: 400 });
        let parent = args.database_id ? { type: "database_id", database_id: args.database_id } : undefined;
        if (args.create_database) {
          const linkedDatabaseId = this.#id("linked-database");
          this.objects.set(linkedDatabaseId, {
            object: "database",
            id: linkedDatabaseId,
            parent: args.create_database.parent,
            data_sources: [{ id: args.data_source_id }],
            in_trash: false,
          });
          parent = { type: "database_id", database_id: linkedDatabaseId };
        }
        const object = { object: "view", id: this.#id("view"), ...args, parent };
        this.viewObjects.set(object.id, object);
        return object;
      }),
      update: async ({ view_id, ...changes }) => this.#record("views.update", { view_id, ...changes }, () => {
        if (this.failViewUpdate) throw Object.assign(new Error("view update unavailable"), { status: 400 });
        const current = this.viewObjects.get(view_id);
        if (!current) throw Object.assign(new Error("not found"), { status: 404 });
        const updated = { ...current, ...changes, configuration: changes.configuration ?? current.configuration };
        this.viewObjects.set(view_id, updated);
        return updated;
      }),
      list: async (args) => this.#record("views.list", args, () => ({
        object: "list",
        results: [...this.viewObjects.values()]
          .filter((view) => view.database_id === args.database_id || view.data_source_id === args.data_source_id)
          .map(({ id }) => ({ object: "view", id })),
        has_more: false,
        next_cursor: null,
      })),
      retrieve: async ({ view_id }) => this.#record("views.retrieve", { view_id }, () => {
        const value = this.viewObjects.get(view_id);
        if (!value) throw Object.assign(new Error("not found"), { status: 404 });
        return value;
      }),
    };
    this.search = async (args) => this.#record("search", args, () => ({
      object: "list",
      results: [...this.objects.values()].filter((item) => {
        if (!args.query) return true;
        const title = item.properties?.title?.title?.[0]?.text?.content
          ?? item.title?.[0]?.text?.content
          ?? "";
        return title === args.query;
      }),
      has_more: false,
      next_cursor: null,
    }));
    this.blocks = {
      children: {
        append: async (args) => this.#record("blocks.children.append", args, () => ({ object: "list", results: args.children ?? [] })),
        list: async (args) => this.#record("blocks.children.list", args, () => ({ object: "list", results: [...(this.children.get(args.block_id) ?? [])], has_more: false, next_cursor: null })),
      },
    };
  }

  seedObject(object) {
    this.objects.set(object.id, object);
    return object;
  }

  seedView(view) {
    this.viewObjects.set(view.id, view);
    return view;
  }

  callsFor(name) {
    return this.calls.filter((call) => call.name === name);
  }

  #id(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  async #record(name, args, operation) {
    this.calls.push({ name, args });
    return operation();
  }
}
