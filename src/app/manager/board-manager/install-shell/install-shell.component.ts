import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { Subscription } from 'rxjs';
import { BoardJsonCloud } from '../../../core/interfaces';
import { ElectronService } from '../../../core/services';
import { ArduinoCliService } from '../../../core/services/arduino-cli.service';
import { ConfigService } from '../../../core/services/config.service';
import { isErrorInfo_Build, isErrorInfo_Upload, isSystemInfo, isUsefulInfo_Build, isUsefulInfo_Upload } from '../../../shell/info';

export enum InstallState {
  INSTALL_CORE_CHECK = 0,
  INSTALL_CORE_DOWNLOAD = 1,
  INSTALL_CORE_ING = 2,
  INSTALL_CORE_DONE = 3,
  INSTALL_CORE_FAIL = -1,

  INSTALL_BOARD_DOWNLOAD = 4,
  INSTALL_BOARD_DONE = 5,
  INSTALL_BOARD_FAIL = -2,
}

@Component({
  selector: 'app-install-shell',
  templateUrl: './install-shell.component.html',
  styleUrls: ['./install-shell.component.scss']
})
export class InstallShellComponent implements OnInit {

  @Input() boardJson_cloud: BoardJsonCloud;

  state = InstallState.INSTALL_CORE_CHECK;
  child_installCore;

  constructor(
    private configService: ConfigService,
    private electronService: ElectronService,
    private arduinoCli: ArduinoCliService,
    private message: NzMessageService,
    private modalRef: NzModalRef,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.install()
  }

  ngOnDestroy(): void {
    this.arduinoCli.killChild()
  }

  async install() {
    try {
      this.changeState(InstallState.INSTALL_BOARD_DOWNLOAD)
      this.electronService.installBoardJson(this.boardJson_cloud)
      this.changeState(InstallState.INSTALL_CORE_CHECK)
      let arduinoCoreList = await this.arduinoCli.checkArduinoCoreList()
      if (!arduinoCoreList.includes(this.boardJson_cloud.core)) {
        if (this.boardJson_cloud.core_setup[0].mode == "git_7z") {
          this.changeState(InstallState.INSTALL_CORE_DOWNLOAD)
          this.child_installCore = this.electronService.installCore()
          this.child_installCore.on('message', (data: any) => {
            console.log(data.state)
            switch (data.state) {
              case 'INSTALL_CORE_DOWNLOAD':
                this.changeState(InstallState.INSTALL_CORE_DOWNLOAD)
                break;
              case 'INSTALL_CORE_ING':
                this.changeState(InstallState.INSTALL_CORE_ING)
                break;
              case 'INSTALL_CORE_DONE':
                this.changeState(InstallState.INSTALL_CORE_DONE)
                setTimeout(() => {
                  this.changeState(InstallState.INSTALL_BOARD_DONE)
                }, 1000);
                setTimeout(() => {
                  this.close();
                }, 2000);
                break;
              case 'INSTALL_CORE_FAIL':
                this.changeState(InstallState.INSTALL_CORE_FAIL)
                break;
              default:
                break;
            }
          })
          this.child_installCore.send({ data: this.boardJson_cloud })
        }
        // if (this.boardJson_cloud.core_setup[0].mode == "arduino_cli") {
        //   await this.arduinoCli.installCore(this.boardJson_cloud);
        // } else if (this.boardJson_cloud.core_setup[0].mode == "download_exec") {
        //   await this.electronService.installcore(this.boardJson_cloud);
        // }  
      } else {
        setTimeout(() => {
          this.changeState(InstallState.INSTALL_BOARD_DONE)
        }, 1000);
        setTimeout(() => {
          this.close();
        }, 2000);
      }
    } catch (error) {
      console.error(error);
      this.changeState(InstallState.INSTALL_BOARD_FAIL)
    }
  }

  changeState(state: InstallState) {
    this.state = state
    this.cd.detectChanges()
  }

  close() {
    localStorage.setItem('guide', 'hide')
    if (typeof this.child_installCore != 'undefined') this.child_installCore.kill()
    this.configService.init()
    this.modalRef.close()
  }

  stop() {
    if (typeof this.child_installCore != 'undefined') this.child_installCore.kill()
    let boardFileName = this.boardJson_cloud.file.split('/').pop()
    this.electronService.delBoardJson(boardFileName)
    this.modalRef.close()
  }

  trackFunc = (index, item) => {
    return index
  }

  isSystemInfo(data: string) {
    return isSystemInfo(data)
  }

  isErrorInfo_Build(data: string) {
    return isErrorInfo_Build(data)
  }

  isErrorInfo_Upload(data: string) {
    return isErrorInfo_Upload(data)
  }

}
