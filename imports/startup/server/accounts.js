import { TOConnect } from '../../api/toconnect/server/TOConnect';
Accounts.registerLoginHandler(TOConnect.loginHandler);