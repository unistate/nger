import { TypeContext } from "ims-decorator";
import { CommandMetadataKey, CommandClassAst, OptionMetadataKey, OptionPropertyAst, OptionOptions, visitor, NgModuleClassAst, NgModuleMetadataKey, Platform } from "nger-core";
import yargs, { Argv, Arguments } from 'yargs';
import chalk from 'chalk';
import { join } from 'path';
import { ConsoleLogger, LogLevel } from 'nger-logger';
const pkg = require(join(__dirname, '../', 'package.json'))
export class NgerPlatformCli extends Platform {
    logger: ConsoleLogger;
    constructor() {
        super();
        this.logger = new ConsoleLogger(LogLevel.debug);
    }
    run(context: TypeContext) {
        let _yargs = yargs;
        const ngModule = context.getClass(NgModuleMetadataKey) as NgModuleClassAst;
        _yargs = _yargs
            .usage(`欢迎使用nger ${pkg.version || '1.0.0'}`)
            .help('h')
            .alias('h', 'help')
            .describe('help', '查看帮助信息')
            .version('v')
            .alias('v', 'version')
            .describe('version', '查看版本号信息')
            .epilog(`${chalk.green("power by ims")}`)
        _yargs.example(`ims -h`, `查看所有命令及使用详情`);
        _yargs.example(`ims -v`, `查看版本号`);
        if (ngModule.declarations) {
            ngModule.declarations.filter(it => !!it.getClass(CommandMetadataKey)).map(context => {
                const command = context.getClass(CommandMetadataKey) as CommandClassAst;
                if (!!command) {
                    const options = context.getProperty(OptionMetadataKey) as OptionPropertyAst[];
                    const def = command.ast.metadataDef;
                    _yargs = _yargs
                        .example(def.example.command, def.example.description)
                        .command(def.name, def.description, (args: Argv<any>) => {
                            options.map(option => {
                                const def: OptionOptions = option.ast.metadataDef;
                                const name = option.ast.propertyType.name;
                                if (name === 'Boolean') {
                                    def.boolean = true;
                                } else if (name === 'String') {
                                    def.string = true;
                                }
                                args.option(option.ast.propertyKey as string, {
                                    ...def,
                                    default: context.instance[option.ast.propertyKey]
                                });
                            });
                            return args
                        }, async (argv: Arguments<any>) => {
                            const { _, $0, ...props } = argv;
                            options.map(opt => {
                                const def: OptionOptions = opt.ast.metadataDef;
                                const key = opt.ast.propertyKey;
                                let val: any;
                                if (props[key]) {
                                    val = props[key];
                                    delete props[key];
                                    if (typeof def.alias === 'string') {
                                        delete props[def.alias];
                                    }
                                }
                                context.instance[opt.ast.propertyKey] = val;
                            });
                            Object.keys(props).map(key => context.instance[key] = props[key])
                            await context.instance.run();
                        });
                }
            })
        }
        _yargs.argv;
    }
}
