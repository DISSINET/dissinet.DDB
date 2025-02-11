<p align="center" width="100%" style="background: white; padding-top:5px;">
    <img width="50%" src="./logo/logo-full.png" style="background: transparent;">
</p>

[![deploy staging](https://github.com/DISSINET/InkVisitor/actions/workflows/dev.yml/badge.svg?branch=dev)](https://github.com/DISSINET/InkVisitor/actions/workflows/dev.yml)

## Description

InkVisitor is an open-source browser-based application for the manual entry of complex structured data from textual resources in the humanities and the social sciences. The data are entered in the form of statements, which interconnect entities of various different classes into semantic quadruples (subject, verb, object 1, object 2) following the syntactic structure of texts. InkVisitor serves as a data-entry front-end for [RethinkDB](https://rethinkdb.com/) research databases which then allow for various kinds of quantitative and computational analyses of the data to be performed.

## Acknowledgements

InkVisitor has been developed in the [Dissident Networks Project (DISSINET)](https://dissinet.cz), a historical and social scientific research project focusing on medieval religious dissidence, inquisition, and inquisitorial records. The development has received substantial funding from the Czech Science Foundation (EXPRO project No. GX19-26975X “Dissident Religious Cultures in Medieval Europe from the Perspective of Social Network Analysis and Geographic Information Systems”) and the European Research Council (ERC Consolidator Grant, project No. 101000442 “Networks of Dissent: Computational Modelling of Dissident and Inquisitorial Cultures in Medieval Europe”).

The lead developer of the application is [Adam Mertel](https://github.com/adammertel/). Other contributors of code include Petr Hanák, Ján Mertel and others. The lead authors of the data model are David Zbíral and Robert L. J. Shaw. Other contributors to the data model and testers include Tomáš Hampejs, Jan Král, Katia Riccardo and others.

## Data model

### Purpose

The data model upon which InkVisitor is built is destined to capture complex natural-language data with all their **uncertainties, narrative perspective, and semantic nuance**. It does so in the semantically rich form of **quadruples**, which are an extended form of semantic triples destined to capture, more naturally than triples, the structure of languages with two grammatical objects (e.g., “Mary gave a present to Peter”: subject, verb, object 1, object 2) as well as with chains of statements (e.g., “Mary told Peter – that she would give him a present”) and multiple sentence constituents.

The data model captures not only editorial assessment of **certainty level**, but also the overall perspective in its two key aspects: epistemic level and modality. **Epistemic level** expresses whether a claim is directly in the text, or is an interpretation thereof, or is an inference by and large independent from the text. **Modality** captures whether a given statement of the text is a positive utterance of the state of affairs, a question, a condition, a wish etc.

While the DISSINET data model has been developed primarily to capture medieval inquisitorial records, it represents a quite **generalized data model** of rare complexity from which historians, humanists, and social scientists will benefit for bridging between quantitative and qualitative research in consequential ways and transcend the limitations of, on the one hand, Computer-Assisted Qualitative Data Analysis Software (CAQDAS) with its strongly hypothesis-driven and classificatory approach, and on the other, the limitations of fact-oriented tabular data collection which tends to lose much of the salient discursive qualities of the original data sources.

The DISSINET data model represents a unique way to precisely represent textual sources in a deeply structured and interconnected manner.

### Entity types

A **Statement** is an Entity type which has the purpose of relating other Entities. All statements (as well as all other entities) have unique IDs, and their original order in the text is preserved, thereby allowing to follow the development of an action in the narrative, the interplay of questions and answers, etc.

The other Entity types covered in the data model are:

- **Action type**
- **Concept**
- **Person**
- **Group**
- **Being** (typically, animal)
- **(Physical) Object**
- **Location**
- **Event**
- **Value**
- **Text / Text part**
- **Resource**

### Properties and their uses

The uses of properties include:

- Modelling adjectives concerning actants.
- Instantiating Entities to parent types.
- Defining time and place of action (including in fuzzy terms).
- Recording other adverbials, for example those concerning manner of action, circumstances, causes or consequences of action.

## User Administration

The environment supports three user roles:

- admin,
- editor,
- viewer.

Further, admins may grant particular users (editors and viewers) access rights for specified territories. Editor role may be granted by "edit" rights, viewer role has "view" rights.

**Entity Detail** is accessible to all roles. The viewer is not allowed to change any value, while the editor may change label, detail, notes, language and add, remove and edit property statements with the status of "pending." Moreover, all metaprops in detail that he creates are getting status "pending." Admin has full access to internal attributes of the entity (status, class) and metaprops. All metaprops he creates have the status "approved."

Only admin and editor with edit rights in the parent **Territory** (T) may edit, add or remove a child T. Editors and viewers do not see T they have no rights to in the T Tree. Only "edit" rights for the T grant the rights to add a new Statement under that particular T, or any other child of that T. That means that the admin has first to create a T and grant edit rights to editors.

To administrate the users rights, admin roles may access the **administration window**, where they can append new territories to editors and viewers. They can also create new users, change roles, see passwords or delete users. Admin role is not possible to be assigned or deleted through this environment.

## Packages

#### Client

For more information see [client package](./packages/client)

### Server

For more information see [server package](./packages/server)

#### Database

For more information see [database package](./packages/database)

#### Shared

Package containing typescript definitions, types and enums, that should be available to both client & server.

## Development

### Install

Install `pnpm` version `>=10.1.0`. You can switch the `pnpm` versions by running `corepack prepare pnpm@<version> --activate`.
Go to all three folders in `packages` (`client`, `server`, `database`) and run `pnpm i` in each of them.
Before continuing, please ensure that you have database instance setup & running (see deploying with docker below)

## Deploy

To deploy the Inkvisitor instance, you can use Docker (or Podman), host it on Kubernetes cluster, or build and deploy the packages separately.

### Deploy with Docker

To use docker to deploy the InkVisitor application:

1.  Install [docker](https://docs.docker.com/get-docker/), [docker-compose tool](https://docs.docker.com/compose/install/).
2.  Install [pnpm](https://pnpm.io/).
3.  Clone | Fork | Download the Inkvisitor [repository](https://github.com/DISSINET/InkVisitor).
4.  For server - prepare `.env` files for servers listed under `env_file` sections in `docker-compose.yml` file. Check the server's [README.md](https://github.com/DISSINET/InkVisitor/blob/dev/packages/server/README.md) and [example.env](https://github.com/DISSINET/InkVisitor/blob/dev/packages/server/env/example.env) files for more information. Install server dependencies by `pnpm i`
5.  For client app - prepare `.env.<ENV>` file that should identify the appropriate environment under the `build -> args` section in `docker-compose.yml` file. You can see the client's [README.md](https://github.com/DISSINET/InkVisitor/blob/dev/packages/client/README.md) and [example.env](https://github.com/DISSINET/InkVisitor/blob/dev/packages/client/env/example.env) files to ensure you have included all the necessary configuration information.
6.  Run the database - first, prepare `.env` file according to the documentation. Then, run either as a standalone service or containerized using `docker-compose up -d database`. Now, you have to create a database `inkvisitor` - one option is to navigate to `http://localhost:8080/#dataexplorer` and run query `r.dbCreate("inkvisitor")`.
7.  The database will be now empty, so to set up the database structure and import some testing data, go to `packages/database` and run `pnpm start` (`pnpm i` might be needed as well). Following the information in the prompt - first, choose database `inkvisitor` by pressing the `L` key, then pick a dataset to import using the `D` key. We recommend to use the `empty` dataset for the first run. Then, press `X` to process the import. Navigate to `http://localhost:8080/#dataexplorer` and enter query `r.db('inkvisitor').table('entities')` to check if the import went fine.
8.  Build app image (will also be done in next step if not available) by running `docker-compose build inkvisitor` (or `docker-compose build inkvisitor-<env>`).
9.  Run the containerized application with the command `docker-compose up inkvisitor` (or `inkvisitor-<env>`).

### Kubernetes

See [kube](./kube) directory for examples. Please, check your cluster's capabilities as the setup could differ.

### Deploy by packages

The InkVisitor codebase consists of three interconnected packages (parts) - the client application, the server, and the database (set of tools/import datasets). You can deploy those packages individually if you do not want to use Docker. In each step, make sure to have the appropriate `.env.<env>` file accessible - see the Readme.md file in the package for more information.

#### 1\. Database

1. Follow tutorials on the [official page](https://rethinkdb.com/docs/install/) to install RethinkDB on your machine, or simply use `docker compose up -d database`.
2. Use the import script to create the database structure and (optional) import some testing data by running `pnpm start` and following the information in the prompt. Use at least `empty` dataset - for bare minimum.

#### 2\. Client application

The client application runs on static files - html/css/js + additional assets. These files need to be moved to your HTTP server by:

1.  Build the frontend app by `pnpm run build-<env>` to create/update the `dist` folder. `<env>` dictates which `.env.<env>` file will be used.
2.  Copy contents of `dist` folder to the directory used by your HTTP server.

#### 3\. Server

The server is also built in Javascript, using mainly the Node + Express libraries. You need to first build the application, move the build to your server and run it from there.

1.  Run `pnpm run build` to transpile the code.
2.  Move the `dist` folder to your server that supports the Node.js environment.
3.  Do `ENV_FILE=<env> yarn run start:dist` to run the built application with a loaded `.env.<env>` file.

For quicker use, use can also run the server directly without building using `pnpm start` (this uses `nodemon` tool and `.env.development` environment file).

### SSL

The app does not support ssl internally, it should be handled in upper layer, ie. [nginx](https://docs.nginx.com/nginx/admin-guide/security-controls/securing-http-traffic-upstream/). Please adjust `APIURL` variable in client's `.env` file to use `https` instead of `http`.

### Firewall

Make sure the ports required by each application are not blocked. Required ports are listed in [docker-compose.yml](https://github.com/DISSINET/InkVisitor/blob/dev/docker-compose.yml). Examples:

1.  [ufw](https://help.ubuntu.com/community/UFW): `ufw allow <port>`
2.  [firewalld](https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/security_guide/sec-using_firewalls): `firewall-cmd --zone=public --permanent --add-port=<port>/tcp`

Setup for additional system specific features (reverse proxies etc) are beyond the scope of this readme.
You should be able to allow at least the port for server api (default is 3000) and port for serving client files (if using docker image, it would be served by server api).
You don't need to allow public access to database, however rethinkdb serves monitoring tool on port 8080.

## ACL - access control list

Layer/middleware which controls access to respective resources (meaning the endpoint) in this application.
Access is defined in model called AclPermission. Resource is identified by controller and method name.
Specific access-check is defined by permission entry and matching user's group.

Exceptions: admin is by default allowed to use all permissions. Permission with '\*' value is allowed by all roles.

### Examples

User { role: "xxx" } + Permission { controller: "actants", name: "get", roles: ["xxx", "yyy"]} => allowed

User { role: "bbb" } + Permission { controller: "actants", name: "get", roles: ["xxx", "yyy"]} => not allowed

User { role: "bbb" } + Permission { controller: "actants", name: "get", roles: ["*"]} => allowed by wildcard

User { role: "admin" } + Permission { controller: "actants", name: "get", roles: []} => allowed by default
