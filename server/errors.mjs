export class AppError extends Error {
  constructor(status,code,message,retryAfter){super(message);this.status=status;this.code=code;this.retryAfter=retryAfter;}
}
export const unavailable=(message)=>new AppError(503,'NOT_CONFIGURED',message);
